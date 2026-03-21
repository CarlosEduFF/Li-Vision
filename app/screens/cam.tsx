import { useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import { detectGesture } from "@/services/gestureService";

export default function CameraScreen() {

  const cameraRef = useRef<CameraView | null>(null);
  const [gesture, setGesture] = useState<string | null>(null);

  const startDetection = async () => {
    if (!cameraRef.current) return;



    const interval = setInterval(async () => {
      const photo = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.5,
        skipProcessing: true
      });
      if (!photo) return;
      const result = await detectGesture(photo.uri);
      setGesture(result);

    }, 500); // 2 FPS

    return () => clearInterval(interval);
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />

        {gesture && (
          <Text style={styles.gestureText}>
            Gesto: {gesture}
          </Text>
        )}
      </View>
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraContainer: {
    height: 300,
    margin: 20,
    borderRadius: 20,
    overflow: "hidden"
  },

  camera: {
    flex: 1
  },
  gestureText: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    fontSize: 24,
    color: "white"
  }
});