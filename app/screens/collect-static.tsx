import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import { router } from "expo-router";

// Fake Live Camera View just to simulate the frame UI
export default function CollectStaticScreen() {
  const [label, setLabel] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [sampleCount, setSampleCount] = useState(0);

  const captureStatic = async () => {
    if (!label || !datasetName) return;
    
    // Fake hand landmarks representation from "camera"
    const mockHandLandmarks = {
      landmark: Array(21).fill({ x: 0.5, y: 0.5, z: 0.0 })
    };

    try {
      const res = await trainingService.startStaticCollection(label, datasetName, mockHandLandmarks);
      if (res.ok) {
        setSampleCount(res.sample_count);
      }
    } catch (e) {
      console.log("Erro na captura:", e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Coleta Estática</Text>
      </View>

      <View style={styles.camPlaceholder}>
        <Text style={{color:"#888"}}>Live Camera View...</Text>
        <Text style={{color:"#00e5ff", marginTop: 10}}>Label: {label || "?"}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Dataset Nome</Text>
        <TextInput 
          style={styles.input}
          placeholderTextColor="#666"
          placeholder="EX: ALFABETO_V1"
          value={datasetName}
          onChangeText={(v) => setDatasetName(v.toUpperCase())}
        />
        
        <Text style={styles.label}>Label (Letra)</Text>
        <TextInput 
          style={styles.input}
          placeholderTextColor="#666"
          placeholder="EX: A"
          value={label}
          maxLength={1}
          onChangeText={(v) => setLabel(v.toUpperCase())}
        />

        <TouchableOpacity style={styles.captureBtn} onPress={captureStatic}>
          <MaterialIcons name="camera" size={24} color="#000" />
          <Text style={styles.captureBtnText}>Capturar Frame</Text>
        </TouchableOpacity>

        <Text style={styles.stats}>
          Amostras coletadas para "{label}": {sampleCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  camPlaceholder: { height: 300, backgroundColor: "#1c2026", borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  form: { gap: 15 },
  label: { color: "#888", fontSize: 14, fontWeight:"bold" },
  input: { backgroundColor: "#1c2026", color: "#00e5ff", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)", fontSize: 18, fontWeight: "bold" },
  captureBtn: { backgroundColor: "#00e5ff", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 10, gap: 10, marginTop:10 },
  captureBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  stats: { color: "#888", textAlign: "center", marginTop: 10 }
});
