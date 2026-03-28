import { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  gestureWS,
  ConnectionStatus,
  GestureResult,
} from "@/services/gestureWebSocket";

// TODO: Instale "react-native-vision-camera" e "react-native-fast-tflite"

export default function CameraScreen() {
  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  // TODO: Habilitar isso após o npm install
  const device = useCameraDevice("front");
  const plugin = useTensorflowModel(require("../../assets/hand_landmarker.tflite"));
  const { resize } = useResizePlugin(); // Plugin to convert Frame to TypedArray

  const handleGesture = useCallback((result: GestureResult) => {
    if (result.gesture) {
      setGesture(result.gesture);
      setConfidence(result.confidence);
    }
  }, []);

  const handleStatusChange = useCallback((status: ConnectionStatus, message?: string) => {
    setConnectionStatus(status);
    if (status === "failed") {
      Alert.alert("Erro", "Falha WebSocket Local");
    }
  }, []);

  useEffect(() => {
    gestureWS.connect(handleGesture, handleStatusChange);
    return () => gestureWS.disconnect();
  }, []);

  
  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    if (plugin.state == 'loaded') {
      // 1. Convert Frame to a TypedArray (Uint8Array or Float32Array) expected by TFLite
      // The hand_landmarker model usually expects 256x256 or 192x192 RGB input. 
      // Adjust width/height if needed based on the exact model requirement!
      const resizedFrame = resize(frame, {
        scale: {
          width: 256, 
          height: 256,
        },
        pixelFormat: 'rgb', 
        dataType: 'float32', // Change to 'uint8' if your model is quantized
      });

      // 2. Run the model using the typed array
      const output = plugin.model.runSync([resizedFrame]);
      // Extrai os x,y,z da mão do TFLite diretamente de [output] aqui.
      
      const landmarksJSON = [
         // Array gerado no formato {x, y, z}
      ];

      // Envia de imediato sem lag pelo JS:
      // runOnJS(gestureWS.sendLandmarks)(landmarksJSON);
    }
  }, [plugin]);
  

  const statusConfig = { color: connectionStatus === "connected" ? "#4caf50" : "#f44336", label: connectionStatus };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Li-Vision Edge Tracker</Text>
      </View>

      <View style={styles.cameraContainer}>
        {/*
          <Camera
            style={styles.camera}
            device={device!}
            isActive={true}
            frameProcessor={frameProcessor}
          />
        */}
        <Text style={styles.warn}>O modo Edge TFLite requer build nativo do Expo.</Text>
        
        {gesture && (
          <View style={styles.gestureOverlay}>
            <Text style={styles.gestureLabel}>{gesture}</Text>
            <Text style={styles.confidenceText}>{(confidence * 100).toFixed(0)}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 16, gap: 12 },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: "#1c2026" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "bold", color: "#fff" },
  cameraContainer: { flex: 1, margin: 16, borderRadius: 24, padding: 16, backgroundColor: '#222', justifyContent: 'center' },
  camera: { flex: 1 },
  warn: { color: 'yellow', textAlign: 'center', fontSize: 16 },
  gestureOverlay: { position: "absolute", bottom: 24, alignSelf: "center", backgroundColor: "rgba(0, 229, 255, 0.15)", borderWidth: 1, borderColor: "#00e5ff", borderRadius: 16, padding: 24, flexDirection: "row", gap: 12 },
  gestureLabel: { fontSize: 32, fontWeight: "bold", color: "#00e5ff" },
  confidenceText: { fontSize: 16, color: "#00e5ff", opacity: 0.8 },
});