import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  gestureWS,
  ConnectionStatus,
  GestureResult,
  DetectionMode,
} from "@/services/gestureWebSocket";
import {
  detectHandLandmarks,
  LandmarkPoint,
} from "@/services/handLandmarkerPlugin";
import { useModelStatus } from "@/hooks/useModelStatus";
import { trainingService } from "@/services/trainingService";

// ──────────────────────────────────────────────
// Configurações dos modos de detecção
// ──────────────────────────────────────────────
const DETECTION_MODES: { key: DetectionMode; label: string; desc: string; icon: string }[] = [
  { key: "hybrid",     label: "Híbrido",        desc: "Combina regras + ML estático + ML dinâmico",   icon: "merge-type" },
  { key: "rules",      label: "Regras Lógicas", desc: "Apenas detectores baseados em lógica (A–E)",   icon: "calculate" },
  { key: "ml",         label: "ML Estático",    desc: "Apenas modelos de gestos sem movimento",       icon: "pan-tool" },
  { key: "dynamic_ml", label: "ML Dinâmico",    desc: "Apenas modelos de gestos com movimento",       icon: "dynamic-form" },
];

export default function CameraScreen() {
  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [apiError, setApiError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("hybrid");
  const [showModeModal, setShowModeModal] = useState<boolean>(false);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

  // ── Health check do modelo Edge ──
  const { status: modelStatus, errorMessage: modelError } = useModelStatus();

  // Transformação correta de coordenadas para o sensor do aparelho (Modo 3)
  const transformPoint = (lm: any) => ({ x: 1.0 - lm.y, y: 1.0 - lm.x, z: lm.z });

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
      setDetectionMode(result.mode as DetectionMode);
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
    // Auto-ativar melhor modelo no servidor se nenhum estiver ativo
    const autoActivateModel = async () => {
      const activeId = await AsyncStorage.getItem('activeModelId');
      const modelName = await AsyncStorage.getItem('activeModelName');
      if (modelName) setActiveModelName(modelName);

      if (!activeId) {
        try {
          const res = await trainingService.listModels();
          if (res.models && res.models.length > 0) {
            const best = res.models.sort((a: any, b: any) => b.accuracy - a.accuracy)[0];
            await trainingService.activateModel(best.id);
            await AsyncStorage.setItem('activeModelId', best.id);
            await AsyncStorage.setItem('activeModelName', best.name);
            setActiveModelName(best.name);
            console.log(`[AutoActivate] Modelo "${best.name}" ativado automaticamente`);
          }
        } catch (e) {
          console.log('[AutoActivate] Falha na ativação automática:', e);
        }
      }
    };

    autoActivateModel();
    gestureWS.connect(handleGesture, handleStatusChange, detectionMode);
    return () => gestureWS.disconnect();
  }, []);

  // ──────────────────────────────────────────────
  // Mudar modo de detecção
  // ──────────────────────────────────────────────
  const changeMode = (mode: DetectionMode) => {
    setShowModeModal(false);
    setDetectionMode(mode);
    // Envia ação de troca de modo pelo WebSocket existente (sem reconectar)
    gestureWS.sendAction({ action: "set_mode", mode });
  };

  // ──────────────────────────────────────────────
  // Bridges JS ↔ Worklet
  // ──────────────────────────────────────────────

  /** Recebe landmarks do plugin nativo e atualiza UI + envia para API */
  const onLandmarksDetected = Worklets.createRunOnJS(
    (hands: LandmarkPoint[][]) => {
      if (hands.length > 0) {
        // Atualiza overlay imediatamente (edge — sem delay de rede)
        // Aplica a transformação de coordenadas do sensor
        const transformedHands = hands.map(handLms => handLms.map(transformPoint));
        
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
          onLandmarksDetected(result.hands);
        } else {
          onLandmarksDetected([]);
        }
      } catch (e: any) {
        if (shouldLog) {
          onPluginError(`Frame: ${e?.message || String(e)}`);
        }
        onLandmarksDetected([]);
      }
    },
    [lastSync, frameCount]
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

  const currentModeConfig = DETECTION_MODES.find(m => m.key === detectionMode);

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

        {/* Botão modo de detecção */}
        <TouchableOpacity
          onPress={() => setShowModeModal(true)}
          style={[styles.iconBtn, styles.modeBtnActive]}
          accessibilityLabel="Selecionar modo de detecção"
        >
          <MaterialIcons
            name={(currentModeConfig?.icon as any) || "memory"}
            size={18}
            color="#00e5ff"
          />
          <Text style={styles.modeBtnText} numberOfLines={1} ellipsizeMode="tail">
            {currentModeConfig?.label || detectionMode}
          </Text>
        </TouchableOpacity>

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
            frameProcessor={modelStatus === 'ready' ? frameProcessor : undefined}
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
          <MaterialIcons name="developer-board" size={12} color={modelStatus === 'ready' ? '#00e5ff' : '#ff6b6b'} />
          <Text style={[styles.edgeBadgeText, modelStatus !== 'ready' && { color: '#ff6b6b' }]}>
            {modelStatus === 'ready' ? 'Edge' : 'Edge ✗'}
          </Text>
        </View>

        {/* ── BADGE MODELO ATIVO ── */}
        {activeModelName && (
          <View style={styles.modelBadge}>
            <MaterialIcons name="psychology" size={12} color="#b388ff" />
            <Text style={styles.modelBadgeText} numberOfLines={1}>{activeModelName}</Text>
          </View>
        )}

        {/* ── ERRO DO MODELO EDGE ── */}
        {modelStatus === 'error' && (
          <View style={styles.modelErrorBanner}>
            <MaterialIcons name="error" size={20} color="#ff6b6b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.modelErrorTitle}>Modelo Edge indisponível</Text>
              <Text style={styles.modelErrorDesc} numberOfLines={2}>
                {modelError || 'HandLandmarker não carregou. Detecção local desativada.'}
              </Text>
            </View>
          </View>
        )}

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

      {/* ── MODAL SELEÇÃO DE MODO ── */}
      <Modal transparent visible={showModeModal} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="memory" size={28} color="#00e5ff" />
              <Text style={styles.modalTitle}>Modo de Detecção</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Escolha o cérebro de reconhecimento para esta sessão.
            </Text>

            {DETECTION_MODES.map((mode) => {
              const isActive = detectionMode === mode.key;
              return (
                <TouchableOpacity
                  key={mode.key}
                  style={[styles.modeOption, isActive && styles.modeOptionActive]}
                  onPress={() => changeMode(mode.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeOptionLeft}>
                    <MaterialIcons
                      name={mode.icon as any}
                      size={22}
                      color={isActive ? "#00e5ff" : "#888"}
                    />
                    <View>
                      <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                        {mode.label}
                      </Text>
                      <Text style={styles.modeDesc}>{mode.desc}</Text>
                    </View>
                  </View>
                  {isActive && (
                    <View style={styles.activeDotOuter}>
                      <View style={styles.activeDotInner} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowModeModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    gap: 8,
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
  modeBtnActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.4)",
    maxWidth: 140, // Impede que o botão creça demais e empurre os outros ícones
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#00e5ff",
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
  // Badge modelo ativo
  modelBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(179, 136, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(179, 136, 255, 0.35)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 140,
  },
  modelBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#b388ff",
  },
  // Erro do modelo Edge
  modelErrorBanner: {
    position: "absolute",
    top: 44,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255, 50, 50, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.4)",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modelErrorTitle: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "700",
  },
  modelErrorDesc: {
    color: "#aa6666",
    fontSize: 11,
    marginTop: 2,
  },
  // ── MODAL ──
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#14171d",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#00e5ff",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
    lineHeight: 18,
  },
  modeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c2026",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 10,
  },
  modeOptionActive: {
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderColor: "#00e5ff",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  modeOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#aaa",
  },
  modeLabelActive: {
    color: "#00e5ff",
  },
  modeDesc: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  activeDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 229, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00e5ff",
  },
  modalCloseBtn: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1c2026",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalCloseBtnText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
  },
});