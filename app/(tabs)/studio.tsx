import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function StudioScreen() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const role = await AsyncStorage.getItem("userRole");
      setIsAdmin(role === "admin");
    };
    checkRole();
  }, []);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <MaterialIcons name="dashboard" size={28} color="#00e5ff" />
        <Text style={styles.title}>ML Studio</Text>
      </View>

      <Text style={styles.subtitle}>
        Coleta de dados e gerenciamento de modelos do Li-Vision Edge.
      </Text>

      {/* CARD NAVIGATION */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="backup" size={20} color="#fff" />
          <Text style={styles.sectionTitle}>Aquisição de Datasets</Text>
        </View>
        <View style={styles.optionsGrid}>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/collect-static")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="camera" size={22} color="#888" />
              <Text style={styles.optionText}>Coleta Estática (Frame Único)</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/collect-dynamic")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="videocam" size={22} color="#888" />
              <Text style={styles.optionText}>Gravar Sequência Múltipla (Sinais)</Text>
            </View>
          </TouchableOpacity>
         
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => router.push("/screens/manage-datasets")}
            >
              <View style={styles.optionContent}>
                <MaterialIcons name="folder-open" size={22} color="#00e5ff" />
                <Text style={[styles.optionText, { color: "#00e5ff" }]}>Gerenciar Gestos e Datasets</Text>
              </View>
            </TouchableOpacity>
        </View>
      </View>

      {/* CARD NAVIGATION */}
      {isAdmin && (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="model-training" size={20} color="#fff" />
          <Text style={styles.sectionTitle}>Modelos & Treinamento</Text>
        </View>
        <View style={styles.optionsGrid}>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/train")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="bolt" size={22} color="#888" />
              <Text style={styles.optionText}>Iniciar Treinamento (API)</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/models")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="list" size={22} color="#888" />
              <Text style={styles.optionText}>Gerenciar Modelos do Servidor</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 32, lineHeight: 20 },
  card: { backgroundColor: "#1c2026", borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.15)", shadowColor: "#00e5ff", shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.05)" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff", letterSpacing: 0.5 },
  optionsGrid: { gap: 12 },
  optionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#262a31", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "transparent" },
  optionContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionText: { color: "#888", fontSize: 15, fontWeight: "600" },
});
