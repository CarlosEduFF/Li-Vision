import { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CameraView } from "expo-camera";
import { detectGesture } from "@/services/api";

export default function CameraScreen() {

  const cameraRef = useRef<CameraView | null>(null);

  const [gesture, setGesture] = useState("Nenhum");

  async function capture() {

    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.4
    });

    const result = await detectGesture(photo.uri);

    if (result.gesture) {
      setGesture(`${result.gesture} (${result.confidence.toFixed(2)})`);
    } else {
      setGesture("Nenhum");
    }
  }

  return (
    <View style={styles.container}>

      <CameraView
        ref={cameraRef}
        facing="front"
        style={styles.camera}
      />

      <View style={styles.overlay}>

        <Text style={styles.gestureText}>
          {gesture}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={capture}
        >
          <Text style={styles.buttonText}>
            Detectar
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1
  },

  camera: {
    flex: 1
  },

  overlay: {
    position: "absolute",
    bottom: 80,
    width: "100%",
    alignItems: "center"
  },

  gestureText: {
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
    marginBottom: 20
  },

  button: {
    backgroundColor: "#00AEEF",
    padding: 16,
    borderRadius: 30,
    width: 200,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontSize: 18
  }

});