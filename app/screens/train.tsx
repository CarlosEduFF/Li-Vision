import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import { router } from "expo-router";

export default function TrainScreen() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [existingModels, setExistingModels] = useState<any[]>([]);
  
  const [mode, setMode] = useState<"new" | "retrain">("new");
  const [modelName, setModelName] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resDatasets, resModels] = await Promise.all([
        trainingService.getDatasets(),
        trainingService.listModels()
      ]);
      setDatasets(resDatasets.datasets || []);
      setExistingModels(resModels.models || []);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDataset = (id: string) => {
    setSelectedDatasetIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectExistingModel = (name: string) => {
    setModelName(name);
  };

  const startTraining = async () => {
    if (!modelName || selectedDatasetIds.length === 0) {
      Alert.alert("Aviso", "Preencha o nome do modelo e selecione pelo menos um dataset.");
      return;
    }
    try {
      setStatus({ status: "running" });
      const res = await trainingService.startTraining(selectedDatasetIds, modelName);
      setStatus(res);
    } catch (e) {
      setStatus({ status: "failed", error: String(e) });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Treinar Modelo</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 50 }} />
      ) : (
        <View style={styles.form}>
            {/* Tabs */}
            <View style={styles.tabsRow}>
              <TouchableOpacity 
                style={[styles.tab, mode === "new" && styles.tabActive]}
                onPress={() => { setMode("new"); setModelName(""); }}
              >
                <Text style={[styles.tabText, mode === "new" && styles.tabTextActive]}>Novo Modelo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, mode === "retrain" && styles.tabActive]}
                onPress={() => setMode("retrain")}
              >
                <Text style={[styles.tabText, mode === "retrain" && styles.tabTextActive]}>Retreinar Existente</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{mode === "new" ? "Nome do Novo Modelo" : "Selecione o Modelo Base"}</Text>
            
            {mode === "new" ? (
              <TextInput 
                style={styles.input}
                placeholderTextColor="#666"
                placeholder="EX: LIBRAS_BR"
                value={modelName}
                onChangeText={(v) => setModelName(v.toUpperCase())}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelsScroll}>
                {existingModels.length === 0 && <Text style={{ color: "#888" }}>Nenhum modelo existente.</Text>}
                {existingModels.map(m => (
                  <TouchableOpacity 
                    key={m.name}
                    style={[styles.chip, modelName === m.name && styles.chipActive]}
                    onPress={() => selectExistingModel(m.name)}
                  >
                    <Text style={[styles.chipText, modelName === m.name && styles.chipTextActive]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.label}>Selecionar Datasets ({selectedDatasetIds.length})</Text>
            {datasets.length === 0 && <Text style={{ color: "#888" }}>Nenhum dataset disponível.</Text>}
            {datasets.map(ds => {
              const isSelected = selectedDatasetIds.includes(ds.id);
              return (
                <TouchableOpacity 
                  key={ds.id}
                  style={[styles.dsButton, isSelected && styles.dsButtonActive]}
                  onPress={() => toggleDataset(ds.id)}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={isSelected ? {color:"#00e5ff", fontWeight:"bold", fontSize: 16} : {color:"#ccc", fontSize: 16}}>
                        {ds.name}
                      </Text>
                      <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                        Formato: {ds.type === "static" ? "Estático" : "Dinâmico"}
                      </Text>
                    </View>
                    <MaterialIcons 
                      name={isSelected ? "check-box" : "check-box-outline-blank"} 
                      size={24} 
                      color={isSelected ? "#00e5ff" : "#555"} 
                    />
                  </View>
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity style={styles.captureBtn} onPress={startTraining} disabled={status?.status === "running"}>
              {status?.status === "running" ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <MaterialIcons name="bolt" size={24} color="#000" />
                  <Text style={styles.captureBtnText}>Iniciar Treinamento Mestre</Text>
                </>
              )}
            </TouchableOpacity>

            {status && status.status !== "running" && (
              <View style={styles.statusBox}>
                <Text style={{color: status.status === "completed" ? "#4caf50" : "red", fontWeight:"bold", marginBottom:10}}>
                  Status: {status.status.toUpperCase()}
                </Text>
                
                {status.details && status.details.map((d: any, idx: number) => (
                   <View key={idx} style={{ marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: "#333" }}>
                     <Text style={{color:"#00e5ff", fontWeight:"bold"}}>[{d.type.toUpperCase()}] Model</Text>
                     {d.accuracy !== undefined ? (
                       <Text style={{color:"#ccc"}}>Precisão: {(d.accuracy * 100).toFixed(2)}%</Text>
                     ) : (
                       <Text style={{color:"red"}}>{d.error}</Text>
                     )}
                   </View>
                ))}

                {status.error && <Text style={{color:"red", marginTop: 5}}>{status.error}</Text>}
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
  
  tabsRow: { flexDirection: "row", backgroundColor: "#1c2026", borderRadius: 10, padding: 4, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "rgba(0, 229, 255, 0.15)" },
  tabText: { color: "#888", fontWeight: "bold", fontSize: 13 },
  tabTextActive: { color: "#00e5ff" },

  label: { color: "#888", fontSize: 14, fontWeight:"bold", marginTop: 10 },
  input: { backgroundColor: "#1c2026", color: "#00e5ff", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)", fontSize: 18, fontWeight: "bold" },
  
  modelsScroll: { flexGrow: 0, marginBottom: 5 },
  chip: { backgroundColor: "#1c2026", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  chipActive: { borderColor: "#00e5ff", backgroundColor: "rgba(0, 229, 255, 0.1)" },
  chipText: { color: "#888", fontWeight: "bold" },
  chipTextActive: { color: "#00e5ff" },

  dsButton: { padding: 16, backgroundColor: "#1c2026", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  dsButtonActive: { borderColor: "#00e5ff", backgroundColor: "rgba(0, 229, 255, 0.05)" },
  
  captureBtn: { backgroundColor: "#00e5ff", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 10, marginTop: 20 },
  captureBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  
  statusBox: { marginTop: 20, padding: 20, backgroundColor: "#1c2026", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }
});
