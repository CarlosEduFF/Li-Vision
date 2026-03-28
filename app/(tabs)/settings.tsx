import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { setRunMode, setDetectionMode, getState } from "@/services/api";

export default function SettingsScreen() {
  const [runMode, setRunModeState] = useState<string>("...");
  const [detectionMode, setDetectionModeState] = useState<string>("...");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function loadState() {
    try {
      setIsLoading(true);
      const data = await getState();
      setRunModeState(data.run_mode);
      setDetectionModeState(data.detection?.mode);
    } catch (e) {
      console.log("Erro ao carregar estado da API", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadState();
  }, []);

  async function changeRunMode(mode: string) {
    try {
      setRunModeState(mode); // Optimistic UI update
      await setRunMode(mode);
    } catch (e) {
      console.log("Erro ao mudar run mode", e);
      loadState(); // Reverte em caso de erro
    }
  }

  async function changeDetection(mode: string) {
    try {
      setDetectionModeState(mode); // Optimistic UI update
      await setDetectionMode(mode);
    } catch (e) {
      console.log("Erro ao mudar modo de detecção", e);
      loadState();
    }
  }

  // Helper para componentes visuais interativos
  const OptionButton = ({ label, icon, currentMode, activeMode, onPress }: any) => {
    const isActive = currentMode === activeMode;
    return (
      <TouchableOpacity
        style={[styles.optionBtn, isActive && styles.optionBtnActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <MaterialIcons 
            name={icon} 
            size={22} 
            color={isActive ? "#00e5ff" : "#888"} 
          />
          <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
            {label}
          </Text>
        </View>
        
        {isActive && (
          <View style={styles.activeDotContainer}>
            <View style={styles.activeDot} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <MaterialIcons name="tune" size={28} color="#00e5ff" />
        <Text style={styles.title}>Motor da API</Text>
      </View>

      <Text style={styles.subtitle}>
        Ajuste o comportamento do servidor (Edge) em tempo real.
      </Text>

      {isLoading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Conectando ao Li-Vision Backend...</Text>
        </View>
      ) : (
        <>
          {/* CARD RUN MODE */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="settings-suggest" size={20} color="#fff" />
              <Text style={styles.sectionTitle}>Comportamento do Sistema</Text>
            </View>
            <View style={styles.optionsGrid}>
              <OptionButton
                label="Inferência (Live)"
                icon="bolt"
                currentMode={runMode}
                activeMode="inference"
                onPress={() => changeRunMode("inference")}
              />
              <OptionButton
                label="Coletar Datasets"
                icon="backup"
                currentMode={runMode}
                activeMode="collect"
                onPress={() => changeRunMode("collect")}
              />
              <OptionButton
                label="Treinar (Train)"
                icon="model-training"
                currentMode={runMode}
                activeMode="train"
                onPress={() => changeRunMode("train")}
              />
            </View>
          </View>

          {/* CARD DETECTION MODE */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="memory" size={20} color="#fff" />
              <Text style={styles.sectionTitle}>Cérebro Lógico & ML</Text>
            </View>
            
            <View style={styles.optionsGrid}>
              <OptionButton
                label="Híbrido (Misto)"
                icon="merge-type"
                currentMode={detectionMode}
                activeMode="hybrid"
                onPress={() => changeDetection("hybrid")}
              />
              <OptionButton
                label="Apenas Lógica (Rules)"
                icon="calculate"
                currentMode={detectionMode}
                activeMode="rules"
                onPress={() => changeDetection("rules")}
              />
              <OptionButton
                label="Estático (A-Z)"
                icon="pan-tool"
                currentMode={detectionMode}
                activeMode="ml"
                onPress={() => changeDetection("ml")}
              />
              <OptionButton
                label="Dinâmico (LIBRAS)"
                icon="dynamic-form"
                currentMode={detectionMode}
                activeMode="dynamic_ml"
                onPress={() => changeDetection("dynamic_ml")}
              />
            </View>
          </View>
        </>
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
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 32,
    lineHeight: 20,
  },
  loaderArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    gap: 16,
  },
  loadingText: {
    color: "#00e5ff",
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#1c2026",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)", // Translucent cyan contour
    shadowColor: "#00e5ff",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  optionsGrid: {
    gap: 12,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#262a31",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionBtnActive: {
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    borderColor: "#00e5ff",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8, // for android
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
  },
  optionTextActive: {
    color: "#00e5ff",
    fontWeight: "bold",
  },
  activeDotContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 229, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00e5ff",
  }
});