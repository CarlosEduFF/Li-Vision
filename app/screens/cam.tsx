import { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CameraView } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  gestureWS,
  ConnectionStatus,
  GestureResult,
} from "@/services/gestureWebSocket";

const FRAME_INTERVAL_MS = 150; // ~6-7 fps

export default function CameraScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Flag para evitar envios sobrepostos
  const isProcessing = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------
  // Callbacks do WebSocket
  // -------------------------------------------------------
  const handleGesture = useCallback((result: GestureResult) => {
    if (result.gesture) {
      setGesture(result.gesture);
      setConfidence(result.confidence);
    }
  }, []);

  const handleStatusChange = useCallback(
    (status: ConnectionStatus, message?: string) => {
      setConnectionStatus(status);

      if (status === "failed") {
        Alert.alert(
          "Conexão perdida",
          message || "Não foi possível reconectar com a API.",
          [
            { text: "Tentar novamente", onPress: () => connectWS() },
            { text: "Voltar", onPress: () => router.back() },
          ]
        );
      }
    },
    []
  );

  // -------------------------------------------------------
  // Conectar / Desconectar WS
  // -------------------------------------------------------
  const connectWS = useCallback(() => {
    gestureWS.connect(handleGesture, handleStatusChange);
  }, [handleGesture, handleStatusChange]);

  // -------------------------------------------------------
  // Loop de captura de frames recursivo controlado
  // -------------------------------------------------------
  const startFrameLoop = useCallback(() => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    const captureLoop = async () => {
      // Condições de parada
      if (!cameraRef.current || !isReady || !gestureWS.isConnected() || !isProcessing.current) {
        isProcessing.current = false;
        return;
      }

      try {
        // Reduzido para quality 0.1 para otimizar velocidade no Websocket
        // Adicionado shutterSound: false para impedir som no Android/iOS
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.1,
          skipProcessing: true,
          shutterSound: false,
        });

        if (photo?.base64) {
          gestureWS.sendFrame(photo.base64);
        }
      } catch (e) {
        // Silencia erros de captura
      } finally {
        if (isProcessing.current) {
          // Substitui o setInterval por um timeout controlado
          // Só inicia o próximo ciclo depois do atual finalizar
          intervalRef.current = setTimeout(captureLoop, FRAME_INTERVAL_MS);
        }
      }
    };

    captureLoop();
  }, [isReady]);

  const stopFrameLoop = useCallback(() => {
    isProcessing.current = false;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current as any);
      intervalRef.current = null;
    }
  }, []);

  // -------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------
  useEffect(() => {
    connectWS();

    return () => {
      stopFrameLoop();
      gestureWS.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isReady && connectionStatus === "connected") {
      startFrameLoop();
    } else {
      stopFrameLoop();
    }
  }, [isReady, connectionStatus, startFrameLoop, stopFrameLoop]);

  // -------------------------------------------------------
  // Status badge
  // -------------------------------------------------------
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case "connected":
        return { color: "#4caf50", label: "Conectado" };
      case "connecting":
        return { color: "#ff9800", label: "Conectando..." };
      case "reconnecting":
        return { color: "#ff9800", label: "Reconectando..." };
      case "failed":
        return { color: "#f44336", label: "Desconectado" };
      default:
        return { color: "#888", label: "Offline" };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Li-Vision</Text>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + "33" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onCameraReady={() => setIsReady(true)}
          flash="off"
          animateShutter={false}
        />

        {/* Gesture overlay */}
        {gesture && (
          <View style={styles.gestureOverlay}>
            <Text style={styles.gestureLabel}>{gesture}</Text>
            <Text style={styles.confidenceText}>
              {(confidence * 100).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      {/* Info footer */}
      <View style={styles.footer}>
        <MaterialIcons name="info-outline" size={16} color="#888" />
        <Text style={styles.footerText}>
          Enviando frames via WebSocket • {Math.round(1000 / FRAME_INTERVAL_MS)} fps
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#1c2026",
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#262a31",
  },
  camera: {
    flex: 1,
  },
  gestureOverlay: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    borderWidth: 1,
    borderColor: "#00e5ff",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  gestureLabel: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#00e5ff",
  },
  confidenceText: {
    fontSize: 16,
    color: "#00e5ff",
    opacity: 0.8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 30,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: "#888",
  },
});