import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { APP_LEVELS } from "@/constants/levels";

export default function LevelsInfoScreen() {
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Níveis de Contribuição</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Quanto mais sequências você doa, mais sua conta evolui e mais a nossa IA aprende Libras.
        </Text>

        {APP_LEVELS.map((level, index) => (
          <View key={index} style={[styles.levelCard, { borderColor: level.color + "44" }]}>
            <View style={styles.levelCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: level.color + "22" }]}>
                <FontAwesome5 name={level.icon} size={24} color={level.color} />
              </View>
              <View style={styles.levelTextContainer}>
                <Text style={[styles.levelTitle, { color: level.color }]}>{level.title}</Text>
                <Text style={styles.levelRange}>
                  {level.minSamples === 501 ? "Acima de 500" : 
                   level.minSamples === 101 ? "101 a 500" :
                   level.minSamples === 11 ? "11 a 100" : "0 a 10"} frames
                </Text>
              </View>
            </View>
            <Text style={styles.levelDesc}>{level.desc}</Text>
          </View>
        ))}

        <View style={styles.footerInfo}>
          <MaterialIcons name="info-outline" size={18} color="#697688" />
          <Text style={styles.footerText}>
            As contribuições são validadas pelo nosso motor de inteligência artificial.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 15,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#1c2026",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: "#8a92a3",
    lineHeight: 22,
    marginBottom: 30,
  },
  levelCard: {
    backgroundColor: "#1c2026",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  levelCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 12,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  levelTextContainer: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  levelRange: {
    fontSize: 12,
    color: "#697688",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
  levelDesc: {
    fontSize: 14,
    color: "#a0aab5",
    lineHeight: 20,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#697688",
    textAlign: "center",
    flex: 1,
  },
});
