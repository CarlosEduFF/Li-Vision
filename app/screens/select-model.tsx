import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function SelectModelScreen() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    loadActiveModel();
  }, []);

  const loadActiveModel = async () => {
    const id = await AsyncStorage.getItem("activeModelId");
    setActiveModelId(id);
  };

  const loadModels = async () => {
    try {
      const res = await trainingService.listModels();
      setModels(res.models || []);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const activateModel = async (id: string, name: string) => {
    setActivatingId(id);
    try {
      // Esta chamada na verdade avisa ao backend para carregar/baixar o joblib do Supabase,
      // Se ele já existir na RAM do servidor, será super rápido.
      const res = await trainingService.activateModel(name);
      if (res.ok) {
        await AsyncStorage.setItem("activeModelId", id);
        await AsyncStorage.setItem("activeModelName", name);
        setActiveModelId(id);
        
        Alert.alert(
          "✅ Idioma Configurado!",
          `Sua IA agora está configurada para ${name}.`,
          [{ text: "Incrível", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Erro", res.error || "Falha ao selecionar o idioma.");
      }
    } catch (e) {
      Alert.alert("Erro de conexão", "Não foi possível conectar ao servidor: " + String(e));
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Selecionar Idioma</Text>
      </View>

      <Text style={styles.subtitle}>
        Escolha abaixo o banco de dados (Língua de Sinais) que você quer que a Inteligência Artificial traduza hoje!
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#b388ff" style={{ marginTop: 40 }} />
      ) : models.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="language" size={48} color="#333" />
          <Text style={styles.emptyText}>Nenhum idioma treinado.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {models.map(m => {
            const isActive = activeModelId === m.id;
            const isActivating = activatingId === m.id;

            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                ]}
                onPress={() => !isActive && activateModel(m.id, m.name)}
                disabled={activatingId !== null}
                activeOpacity={0.8}
              >
                <View style={styles.cardIndicator}>
                   <MaterialIcons 
                      name={isActive ? "check-circle" : "radio-button-unchecked"} 
                      size={28} 
                      color={isActive ? "#b388ff" : "#555"} 
                   />
                </View>

                <View style={styles.cardContent}>
                  <Text style={[styles.modelName, isActive && styles.modelNameActive]}>
                    {m.name}
                  </Text>
                  <Text style={styles.modelStatus}>
                    {isActive ? "Sua IA está conectada e fluente nesta língua!" : "Toque para configurar e conectar o cérebro associado."}
                  </Text>
                </View>

                {isActivating && (
                  <View style={{ marginLeft: 10 }}>
                     <ActivityIndicator size="small" color="#b388ff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1c2026",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 30,
    lineHeight: 20,
  },
  list: {
    gap: 16,
  },
  emptyBox: {
    alignItems: "center",
    marginTop: 60,
    gap: 10,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c2026",
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardActive: {
    borderColor: "rgba(179, 136, 255, 0.4)",
    backgroundColor: "rgba(179, 136, 255, 0.05)",
  },
  cardIndicator: {
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  modelName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 20,
    marginBottom: 4,
  },
  modelNameActive: {
    color: "#b388ff",
  },
  modelStatus: {
    color: "#666",
    fontSize: 12,
  }
});
