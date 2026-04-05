import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import { router } from "expo-router";

export default function ModelsScreen() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const res = await trainingService.listModels();
      setModels(res.models);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const activateModel = async (id: string, name: string) => {
    try {
      Alert.alert("Aguarde", `Baixando modelo ${name} do bucket...`);
      const res = await trainingService.activateModel(id);
      if (res.ok) {
        Alert.alert("Sucesso", "Modelo ativado no motor Edge!");
      } else {
        Alert.alert("Erro", res.error);
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Modelos Treinados</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00e5ff" />
      ) : (
        <View style={styles.list}>
          {models.map(m => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.modelName}>{m.name}</Text>
                <Text style={styles.modelType}>{m.type}</Text>
              </View>
              <Text style={styles.accuracy}>Accuracy: {(m.accuracy * 100).toFixed(1)}%</Text>
              <Text style={styles.samples}>Samples Treinados: {m.total_samples_trained}</Text>
              
              <TouchableOpacity style={styles.activateBtn} onPress={() => activateModel(m.id, m.name)}>
                <MaterialIcons name="check-circle" size={20} color="#000" />
                <Text style={styles.activateBtnText}>Ativar no Servidor</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  list: { gap: 15 },
  card: { backgroundColor: "#1c2026", padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  modelName: { color: "#00e5ff", fontWeight: "bold", fontSize: 18 },
  modelType: { color: "#888", fontSize: 12, textTransform: "uppercase" },
  accuracy: { color: "#fff", marginBottom: 5 },
  samples: { color: "#888", marginBottom: 15 },
  activateBtn: { backgroundColor: "#00e5ff", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, borderRadius: 10, gap: 10 },
  activateBtnText: { color: "#000", fontWeight: "bold", fontSize: 14 },
});
