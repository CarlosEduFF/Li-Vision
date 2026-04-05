import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  useCameraPermission,
} from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  gestureWS,
  ConnectionStatus,
  GestureResult,
} from "@/services/gestureWebSocket";
import {
  detectHandLandmarks,
  LandmarkPoint,
} from "@/services/handLandmarkerPlugin";

export default function CameraScreen() {
  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [apiError, setApiError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [detectionMode, setDetectionMode] = useState<string>("edge");
  const [transformIndex, setTransformIndex] = useState(0);

  const transforms = [
    // Troca X/Y (para quando o sensor é 640x480 girado 90)
    { name: "1: Y/X Inv X", calc: (lm: any) => ({ x: 1.0 - lm.y, y: lm.x, z: lm.z }) }, 
    { name: "2: Y/X Inv Y", calc: (lm: any) => ({ x: lm.y, y: 1.0 - lm.x, z: lm.z }) },
    { name: "3: Y/X Inv XY", calc: (lm: any) => ({ x: 1.0 - lm.y, y: 1.0 - lm.x, z: lm.z }) },
    { name: "4: Y/X Direto", calc: (lm: any) => ({ x: lm.y, y: lm.x, z: lm.z }) },
    // Mantém X/Y (para quando o sensor já respeita retrato)
    { name: "5: X/Y Inv X", calc: (lm: any) => ({ x: 1.0 - lm.x, y: lm.y, z: lm.z }) }, 
    { name: "6: X/Y Inv Y", calc: (lm: any) => ({ x: lm.x, y: 1.0 - lm.y, z: lm.z }) },
    { name: "7: X/Y Inv XY", calc: (lm: any) => ({ x: 1.0 - lm.x, y: 1.0 - lm.y, z: lm.z }) },
    { name: "8: X/Y Direto", calc: (lm: any) => ({ x: lm.x, y: lm.y, z: lm.z }) }
  ];

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // ──────────────────────────────────────────────
  // Callbacks WebSocket (resposta do servidor MLP)
  // ──────────────────────────────────────────────
  const handleGesture = useCallback((result: GestureResult) => {
    if (result.error) {
      console.log("[API Error]:", result.error);
      setApiError(result.error);
      setTimeout(() => setApiError(null), 3000);
    } else {
      setApiError(null);
    }

    if (result.gesture) {
      setGesture(result.gesture);
      setConfidence(result.confidence);
    }

    if (result.mode) {
      setDetectionMode(result.mode);
    }
  }, []);

  const handleStatusChange = useCallback(
    (status: ConnectionStatus, message?: string) => {
      setConnectionStatus(status);
      if (status === "failed") {
        Alert.alert(
          "Erro de Conexão",
          `Falha ao conectar à API após várias tentativas.\n${message ?? ""}`,
          [{ text: "OK" }]
        );
      }
    },
    []
  );

  useEffect(() => {
    gestureWS.connect(handleGesture, handleStatusChange);
    return () => gestureWS.disconnect();
  }, []);

  // ──────────────────────────────────────────────
  // Bridges JS ↔ Worklet
  // ──────────────────────────────────────────────

  /** Recebe landmarks do plugin nativo e atualiza UI + envia para API */
  const onLandmarksDetected = Worklets.createRunOnJS(
    (hands: LandmarkPoint[][], tIndex: number) => {
      if (hands.length > 0) {
        console.log(`[Edge] 🖐 ${hands.length} mão(s) detectada(s), ${hands[0].length} pontos`);
        // Atualiza overlay imediatamente (edge — sem delay de rede)
        // Aplica a transformação de coordenadas escolhida pelo usuário
        const transform = transforms[tIndex] || transforms[0];
        
        // Aplica a transformação para todas as mãos detectadas
        const transformedHands = hands.map(handLms => handLms.map(transform.calc));
        
        // Atualiza a tela com a primeira mão
        setLandmarks(transformedHands[0]);

        // Envia landmarks JSON ROTACIONADOS CORRETAMENTE para a API
        if (gestureWS.isConnected()) {
          gestureWS.sendLandmarks(transformedHands);
        }
      } else {
        setLandmarks([]);
      }
    }
  );

  const sendLogToJS = Worklets.createRunOnJS((msg: string) => {
    console.log("[Edge MediaPipe]:", msg);
  });

  const onPluginError = Worklets.createRunOnJS((error: string) => {
    console.error("[Edge ERRO]:", error);
  });

  // ──────────────────────────────────────────────
  // Frame Processor (Edge Computing local)
  // ──────────────────────────────────────────────
  // Throttle: ~10 FPS para manter CPU leve
  const lastSync = Worklets.createSharedValue(0);
  const frameCount = Worklets.createSharedValue(0);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";

      // Throttle: processa no máximo ~10 FPS
      const now = performance.now();
      if (now - lastSync.value < 100) return;
      lastSync.value = now;

      frameCount.value += 1;
      const shouldLog = frameCount.value % 30 === 1; // Log a cada ~3 segundos

      try {
        // Executa MediaPipe HandLandmarker LOCALMENTE no dispositivo
        const result = detectHandLandmarks(frame);

        if (shouldLog) {
          if (result) {
            const handsLen = result.hands ? result.hands.length : 0;
            const errorMsg = (result as any).error;
            sendLogToJS(
              `Frame #${frameCount.value}: ${frame.width}x${frame.height} → ` +
              `${handsLen} mão(s)` +
              (errorMsg ? ` | ERRO: ${errorMsg}` : "")
            );
          } else {
            sendLogToJS(`Frame #${frameCount.value}: plugin retornou null`);
          }
        }

        if (result && result.hands && result.hands.length > 0) {
          onLandmarksDetected(result.hands, transformIndex);
        } else {
          onLandmarksDetected([], transformIndex);
        }
      } catch (e: any) {
        if (shouldLog) {
          onPluginError(`Frame: ${e?.message || String(e)}`);
        }
        onLandmarksDetected([], transformIndex);
      }
    },
    [lastSync, frameCount, transformIndex]
  );

  // ──────────────────────────────────────────────
  // UI helpers
  // ──────────────────────────────────────────────
  const statusConfig = {
    color:
      connectionStatus === "connected"
        ? "#4caf50"
        : connectionStatus === "reconnecting"
        ? "#ff9800"
        : "#f44336",
    label: connectionStatus,
  };

  // Área da câmera (ocupa tudo menos o header)
  const HEADER_HEIGHT = 90;
  const CAM_WIDTH = screenWidth - 32; // margem de 16 cada lado
  const CAM_HEIGHT = screenHeight - HEADER_HEIGHT - 32;

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Voltar"
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Li-Vision Edge</Text>

        {/* Toggle landmarks */}
        <TouchableOpacity
          onPress={() => setShowLandmarks((v) => !v)}
          style={[
            styles.iconBtn,
            showLandmarks && styles.iconBtnActive,
          ]}
          accessibilityLabel="Alternar landmarks"
        >
          <MaterialIcons
            name="grain"
            size={20}
            color={showLandmarks ? "#00e5ff" : "#888"}
          />
        </TouchableOpacity>

        {/* Toggle Rotação */}
        <TouchableOpacity
          onPress={() => setTransformIndex((v) => (v + 1) % transforms.length)}
          style={styles.iconBtn}
          accessibilityLabel="Mudar Rotação"
        >
          <MaterialIcons name="screen-rotation" size={20} color="#ff9800" />
          <Text style={{color: '#ff9800', fontSize: 10, position: 'absolute', bottom: -15, left: 0, width: 60}}>{transforms[transformIndex].name}</Text>
        </TouchableOpacity>

        <View style={styles.statusBadge}>
          <View
            style={[styles.statusDot, { backgroundColor: statusConfig.color }]}
          />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* ── CÂMERA + OVERLAY ── */}
      <View
        style={[
          styles.cameraContainer,
          { width: CAM_WIDTH, height: CAM_HEIGHT },
        ]}
      >
        {hasPermission && device ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
          />
        ) : (
          <View style={styles.permissionBox}>
            <MaterialIcons name="videocam-off" size={48} color="#888" />
            <Text style={styles.warn}>
              Aguardando permissão da câmera...
            </Text>
          </View>
        )}

        {/* ── OVERLAY LANDMARKS (local — instantâneo) ── */}
        {showLandmarks && landmarks.length === 21 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {landmarks.map((lm, idx) => {
              const dotX = lm.x * CAM_WIDTH - 5;
              const dotY = lm.y * CAM_HEIGHT - 5;
              // Pontilha de cor diferente para pontas dos dedos
              const isTip = [4, 8, 12, 16, 20].includes(idx);
              const isWrist = idx === 0;
              return (
                <View
                  key={idx}
                  style={[
                    styles.landmarkDot,
                    {
                      left: dotX,
                      top: dotY,
                      backgroundColor: isWrist
                        ? "#ff6b6b"
                        : isTip
                        ? "#00e5ff"
                        : "rgba(255,255,255,0.7)",
                      width: isTip || isWrist ? 10 : 7,
                      height: isTip || isWrist ? 10 : 7,
                      borderRadius: isTip || isWrist ? 5 : 3.5,
                    },
                  ]}
                />
              );
            })}

            {/* Linhas dos ossos — esqueleto simplificado */}
            {SKELETON_CONNECTIONS.map(([a, b], idx) => {
              if (
                landmarks.length !== 21 ||
                a >= landmarks.length ||
                b >= landmarks.length
              )
                return null;
              const ax = landmarks[a].x * CAM_WIDTH;
              const ay = landmarks[a].y * CAM_HEIGHT;
              const bx = landmarks[b].x * CAM_WIDTH;
              const by = landmarks[b].y * CAM_HEIGHT;
              const length = Math.hypot(bx - ax, by - ay);
              const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
              return (
                <View
                  key={`bone-${idx}`}
                  style={{
                    position: "absolute",
                    left: ax - length / 2,
                    top: ay - 0.75,
                    width: length,
                    height: 1.5,
                    backgroundColor: "rgba(0, 229, 255, 0.4)",
                    transform: [
                      { translateX: length / 2 },
                      { rotate: `${angle}deg` },
                      { translateX: -(length / 2) },
                    ],
                  }}
                />
              );
            })}
          </View>
        )}

        {/* ── BADGE GESTO ── */}
        {gesture && (
          <View style={styles.gestureOverlay}>
            <Text style={styles.gestureLabel}>{gesture}</Text>
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceText}>
                {(confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        )}

        {/* ── BADGE EDGE COMPUTING ── */}
        <View style={styles.edgeBadge}>
          <MaterialIcons name="developer-board" size={12} color="#00e5ff" />
          <Text style={styles.edgeBadgeText}>Edge</Text>
        </View>

        {/* ── ERRO DA API ── */}
        {apiError && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color="#ff6b6b" />
            <Text style={styles.errorText} numberOfLines={2}>
              {apiError}
            </Text>
          </View>
        )}

        {/* ── SEM LANDMARKS ── */}
        {showLandmarks && landmarks.length === 0 && hasPermission && !apiError && (
          <View style={styles.noHandBadge}>
            <MaterialIcons name="pan-tool" size={14} color="#888" />
            <Text style={styles.noHandText}>Nenhuma mão detectada</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Conexões do esqueleto de mão (índices MediaPipe)
// ──────────────────────────────────────────────────────────────
const SKELETON_CONNECTIONS: [number, number][] = [
  // Palma
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Indicador
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Médio
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Anelar
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Mínimo
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Arco da palma
  [5, 9], [9, 13], [13, 17],
];

// ──────────────────────────────────────────────────────────────
// Estilos
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#1c2026",
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#1c2026",
  },
  iconBtnActive: {
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    borderWidth: 1,
    borderColor: "#00e5ff",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1c2026",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  cameraContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "#222",
    overflow: "hidden",
    position: "relative",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  warn: {
    color: "#888",
    textAlign: "center",
    fontSize: 14,
    paddingHorizontal: 20,
  },
  // Landmark dot
  landmarkDot: {
    position: "absolute",
  },
  // Gesto detectado
  gestureOverlay: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "#00e5ff",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  gestureLabel: {
    fontSize: 40,
    fontWeight: "800",
    color: "#00e5ff",
    letterSpacing: 2,
  },
  confidencePill: {
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 14,
    color: "#00e5ff",
    fontWeight: "bold",
  },
  // Edge computing badge
  edgeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 229, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  edgeBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#00e5ff",
    textTransform: "uppercase",
  },
  // Erro da API
  errorBanner: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 50, 50, 0.15)",
    borderWidth: 1,
    borderColor: "#ff6b6b",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    flex: 1,
    fontWeight: "500",
  },
  // Sem mão
  noHandBadge: {
    position: "absolute",
    bottom: 72,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noHandText: {
    color: "#888",
    fontSize: 12,
  },
});