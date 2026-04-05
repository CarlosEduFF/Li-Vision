import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import { router } from "expo-router";

export default function TrainScreen() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [modelName, setModelName] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const res = await trainingService.getDatasets();
      setDatasets(res.datasets);
      if (res.datasets.length > 0) {
        setSelectedDatasetId(res.datasets[0].id);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const startTraining = async () => {
    if (!modelName || !selectedDatasetId) return;
    try {
      setStatus({ status: "running" });
      const dataset = datasets.find(d => d.id === selectedDatasetId);
      const res = await trainingService.startTraining(selectedDatasetId, modelName, dataset.type);
      setStatus(res);
    } catch (e) {
      setStatus({ status: "failed", error: String(e) });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Treinar Modelo</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00e5ff" />
      ) : (
        <View style={styles.form}>
            <Text style={styles.label}>Model Name</Text>
            <TextInput 
              style={styles.input}
              placeholderTextColor="#666"
              placeholder="EX: LIBRAS_PRO"
              value={modelName}
              onChangeText={(v) => setModelName(v.toUpperCase())}
            />

            <Text style={styles.label}>Select Dataset</Text>
            {datasets.map(ds => (
              <TouchableOpacity 
                key={ds.id}
                style={[styles.dsButton, selectedDatasetId === ds.id && styles.dsButtonActive]}
                onPress={() => setSelectedDatasetId(ds.id)}
              >
                <Text style={selectedDatasetId === ds.id ? {color:"#00e5ff", fontWeight:"bold"} : {color:"#888"}}>
                  {ds.name} ({ds.type})
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.captureBtn} onPress={startTraining}>
              <MaterialIcons name="bolt" size={24} color="#000" />
              <Text style={styles.captureBtnText}>Iniciar Treinamento</Text>
            </TouchableOpacity>

            {status && (
              <View style={styles.statusBox}>
                <Text style={{color:"#fff", fontWeight:"bold", marginBottom:10}}>Status: {status.status}</Text>
                {status.accuracy && <Text style={{color:"#00e5ff"}}>Accuracy: {(status.accuracy * 100).toFixed(2)}%</Text>}
                {status.error && <Text style={{color:"red"}}>{status.error}</Text>}
              </View>
            )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  form: { gap: 15 },
  label: { color: "#888", fontSize: 14, fontWeight:"bold" },
  input: { backgroundColor: "#1c2026", color: "#00e5ff", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)", fontSize: 18, fontWeight: "bold" },
  dsButton: { padding: 15, backgroundColor: "#1c2026", borderRadius: 10, borderWidth: 1, borderColor: "transparent" },
  dsButtonActive: { borderColor: "#00e5ff" },
  captureBtn: { backgroundColor: "#00e5ff", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 10, gap: 10, marginTop:10 },
  captureBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  statusBox: { marginTop: 20, padding: 15, backgroundColor: "#1c2026", borderRadius: 10 }
});
