import { useEffect, useRef, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { detectGesture } from "@/services/api";

export default function HomeScreen() {

  const [permission, requestPermission] = useCameraPermissions();
  const [gesture, setGesture] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

  async function captureGesture() {

    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.5,
    });

    const result = await detectGesture(photo.uri);

    setGesture(result.gesture);
  }

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text>Permissão da câmera necessária</Text>
        <Button title="Permitir câmera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <CameraView
        style={styles.camera}
        ref={cameraRef}
      />

      <View style={styles.overlay}>
        <Button
          title="Detectar gesto"
          onPress={captureGesture}
        />

        <Text style={styles.text}>
          Gesto: {gesture ?? "nenhum"}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  camera: {
    flex: 1,
  },

  overlay: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    alignItems: "center",
  },

  text: {
    marginTop: 20,
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});