import { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import { detectGesture } from "@/services/gestureService";

export default function CameraScreen() {

  const cameraRef = useRef<CameraView | null>(null);
  const [gesture, setGesture] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startDetection = () => {

    let isProcessing = false;

    const interval = setInterval(async () => {

      if (!cameraRef.current || !isReady) return;
      if (isProcessing) return;

      isProcessing = true;

      try {

        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
          skipProcessing: true
        });
        console.log("URI:", photo.uri);     
        const result = await detectGesture(photo.uri);

        console.log("GESTO:", result);

        setGesture(result);

      } catch (e) {
        console.log("Erro:", e);
      } finally {
        isProcessing = false;
      }

    }, 500);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    const stop = startDetection();
    return () => stop && stop();
  }, [isReady]);

  return (
    <View style={styles.container}>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onCameraReady={() => setIsReady(true)}
          flash="off"
        />

        {gesture && (
          <Text style={styles.gestureText}>
            Gesto: {gesture}
          </Text>
        )}
      </View>

    </View>
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