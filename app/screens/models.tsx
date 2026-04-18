import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function ModelsScreen() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  
  // Controle de accordion/collapse para ver os submodelos
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

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

  const toggleExpand = (id: string) => {
    setExpandedModels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activateModel = async (id: string, name: string) => {
    setActivatingId(id);
    try {
      const res = await trainingService.activateModel(name);
      if (res.ok) {
        await AsyncStorage.setItem("activeModelId", id);
        await AsyncStorage.setItem("activeModelName", name);
        setActiveModelId(id);
        Alert.alert(
          "✅ Modelo Ativo",
          `O grupo "${name}" foi ativado no servidor.`
        );
      } else {
        Alert.alert("Erro", res.error || "Falha ao ativar o modelo.");
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
        <Text style={styles.title}>Modelos Treinados</Text>
      </View>

      <Text style={styles.subtitle}>
        Abaixo estão os seus modelos base. Ao ativar um modelo mestre, tanto suas capacidades estáticas quanto dinâmicas serão carregadas e disponibilizadas globalmente no servidor.
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 40 }} />
      ) : models.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="model-training" size={48} color="#333" />
          <Text style={styles.emptyText}>Nenhum modelo treinado ainda.</Text>
          <Text style={styles.emptyHint}>Vá à tela de Treinar Modelo para iniciar um agora.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {models.map(m => {
            const isActive = activeModelId === m.id;
            const isActivating = activatingId === m.id;
            const isExpanded = expandedModels[m.id];
            
            const hasStatic = !!m.static_model;
            const hasDynamic = !!m.dynamic_model;

            return (
              <View
                key={m.id}
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                ]}
              >
                {/* Cabeçalho do Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <FontAwesome5
                      name="brain"
                      size={20}
                      color={isActive ? "#00e5ff" : "#888"}
                    />
                    <Text style={[styles.modelName, isActive && styles.modelNameActive]}>
                      {m.name}
                    </Text>
                  </View>
                  
                  <TouchableOpacity onPress={() => toggleExpand(m.id)} style={{ padding: 5 }}>
                    <MaterialIcons 
                      name={isExpanded ? "expand-less" : "expand-more"} 
                      size={24} 
                      color="#888" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Subtítulos rápidos e tags */}
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                   {hasStatic && (
                     <View style={styles.typeBadge}><Text style={styles.modelType}>Estático Incluído</Text></View>
                   )}
                   {hasDynamic && (
                     <View style={styles.typeBadge}><Text style={styles.modelType}>Dinâmico Incluído</Text></View>
                   )}
                </View>

                {/* Área Colapsável dos Submodelos */}
                {isExpanded && (
                  <View style={styles.submodelsArea}>
                    {hasStatic && (
                      <View style={styles.submodelRow}>
                        <MaterialIcons name="camera-alt" size={16} color="#00e5ff" />
                        <Text style={styles.submodelText}>
                          Estático: precisão de {(m.static_model.accuracy * 100).toFixed(1)}% com {m.static_model.total_samples_trained} amostras.
                        </Text>
                      </View>
                    )}
                    {hasDynamic && (
                      <View style={styles.submodelRow}>
                        <MaterialIcons name="videocam" size={16} color="#ffab00" />
                        <Text style={styles.submodelText}>
                          Dinâmico: precisão de {(m.dynamic_model.accuracy * 100).toFixed(1)}% com {m.dynamic_model.total_samples_trained} amostras.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Métricas Globais */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricValue}>
                      {m.total_samples}
                    </Text>
                    <Text style={styles.metricLabel}>Total Amostras</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricValue, { color: "#fff" }]}>
                      {hasStatic && hasDynamic ? "2" : "1"}
                    </Text>
                    <Text style={styles.metricLabel}>Sub-redes MLPs</Text>
                  </View>
                </View>

                {/* Badge Ativo */}
                {isActive && (
                  <View style={styles.activeBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#4caf50" />
                    <Text style={styles.activeBadgeText}>Grupo Mestre Ativo</Text>
                  </View>
                )}

                {/* Botão Mestre de Ativação */}
                <TouchableOpacity
                  style={[
                    styles.activateBtn,
                    isActive && styles.activateBtnActive,
                    isActivating && { opacity: 0.7 },
                  ]}
                  onPress={() => activateModel(m.id, m.name)}
                  disabled={activatingId !== null || isActive}
                  activeOpacity={0.7}
                >
                  {isActivating ? (
                    <ActivityIndicator size="small" color={isActive ? "#00e5ff" : "#000"} />
                  ) : (
                    <MaterialIcons
                      name={isActive ? "verified" : "power-settings-new"}
                      size={20}
                      color={isActive ? "#00e5ff" : "#000"}
                    />
                  )}
                  <Text style={[
                    styles.activateBtnText,
                    isActive && styles.activateBtnTextActive,
                  ]}>
                    {isActivating
                      ? "Ativando Mestre..."
                      : isActive
                        ? "Mestre Ativo"
                        : "Ativar Modelo Mestre"}
                  </Text>
                </TouchableOpacity>
              </View>
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
    fontSize: 13,
    color: "#888",
    marginBottom: 24,
    lineHeight: 19,
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
  emptyHint: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  card: {
    backgroundColor: "#1c2026",
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardActive: {
    borderColor: "rgba(0, 229, 255, 0.3)",
    backgroundColor: "#1a2228",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modelName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  modelNameActive: {
    color: "#00e5ff",
  },

  typeBadge: {
    backgroundColor: "#10141a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  modelType: {
    color: "#888",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  submodelsArea: {
    backgroundColor: "#10141a",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  submodelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submodelText: {
    color: "#ccc",
    fontSize: 12,
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#10141a",
    borderRadius: 12,
    padding: 14,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    color: "#00e5ff",
    fontSize: 22,
    fontWeight: "800",
  },
  metricLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  activeBadgeText: {
    color: "#4caf50",
    fontSize: 12,
    fontWeight: "600",
  },

  activateBtn: {
    backgroundColor: "#00e5ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#00e5ff",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  activateBtnActive: {
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  activateBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  activateBtnTextActive: {
    color: "#00e5ff",
  },
});
