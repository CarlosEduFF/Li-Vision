import { useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import { detectGesture } from "@/services/gestureService";

export default function CameraScreen() {

  const cameraRef = useRef<CameraView | null>(null);
  const [gesture, setGesture] = useState<string | null>(null);

  const handleDetection = async () => {
    const result = await detectGesture();
    setGesture(result);
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
      />

      {gesture && (
        <Text style={styles.gestureText}>
          Gesto: {gesture}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1 },
  camera:{ flex:1 },
  gestureText:{
    position:"absolute",
    bottom:50,
    alignSelf:"center",
    fontSize:24,
    color:"white"
  }
});