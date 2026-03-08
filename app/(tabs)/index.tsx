import { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { detectGesture } from "@/services/api";

export default function CameraScreen() {

  const cameraRef = useRef<CameraView | null>(null);

  const [gesture, setGesture] = useState("Nenhum");
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);

  }, []);

  async function capture() {

    if (!cameraRef.current) return;

    setDetecting(true);

    const start = Date.now();

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.4
    });

    const result = await detectGesture(photo.uri);

    const end = Date.now();

    setLatency(end - start);

    if (result.gesture) {
      setGesture(`${result.gesture} (${result.confidence.toFixed(2)})`);
    } else {
      setGesture("Nenhum");
    }

    setDetecting(false);

  }

  if (loading) {

    return (

      <LinearGradient
        colors={["#00AEEF", "#0077B6"]}
        style={styles.loadingContainer}
      >

        <Text style={styles.logo}>
          Li-Vision
        </Text>

        <ActivityIndicator size="large" color="white" />

        <Text style={styles.loadingText}>
          Inicializando câmera...
        </Text>

      </LinearGradient>

    );

  }

  return (
    <View style={styles.container}>

      <CameraView
        ref={cameraRef}
        facing="front"
        style={styles.camera}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.overlay}
      >

        <View style={styles.hud}>

          <Text style={styles.gestureText}>
            {gesture}
          </Text>

          {latency && (
            <Text style={styles.latency}>
              {latency} ms
            </Text>
          )}

        </View>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={capture}
        >
          {detecting ? (
            <ActivityIndicator color="white"/>
          ) : (
            <View style={styles.captureInner}/>
          )}
        </TouchableOpacity>

        <Text style={styles.aiStatus}>
          AI Online
        </Text>

      </LinearGradient>

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

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20
  },

  logo: {
    fontSize: 40,
    color: "white",
    fontWeight: "bold"
  },

  loadingText: {
    color: "white",
    fontSize: 16
  },

  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignItems: "center",
    paddingBottom: 60,
    paddingTop: 40
  },

  hud: {
    alignItems: "center",
    marginBottom: 40
  },

  gestureText: {
    fontSize: 36,
    color: "white",
    fontWeight: "bold"
  },

  latency: {
    color: "#00E5FF",
    marginTop: 6
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },

  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00AEEF"
  },

  aiStatus: {
    color: "#00E5FF",
    fontSize: 14
  }

});