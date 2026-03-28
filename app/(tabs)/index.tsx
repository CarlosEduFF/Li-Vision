import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="precision-manufacturing" size={24} color="#00e5ff" />
          <Text style={styles.logoText}>Li-Vision</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity>
            <MaterialIcons name="notifications" size={24} color="#dfe2eb" />
          </TouchableOpacity>

          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDSZjojJ-8jnM6Lv4FA8cVNPYzHD6-MbsBTYLn2_-_lT-BAEHqNkDvUG6p4LtM9pBMknhjS8t8MTYTwoxZBgHjn5Ojvn8EhiF6Nsza9AlcwgFaxbuJkGz4YXKWPKNIjIo7DBQIdNzoaMSMMlhMdBFTQ-6FFBudV59cDfKHWZkJvp4mCgjq5QzPbFXvJkJ9N45O-GFxGk7xpPzT3nrOGXNCZ0BpxkamONYdfECrKTLojPN195i0agdGPm-hWtwraUPXWYM9zNvyBiGeB",
            }}
            style={styles.avatar}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.title}>Li-Vision</Text>

          <Text style={styles.subtitle}>
            Sistema de reconhecimento de gestos da mão utilizando OpenCV +
            MediaPipe para interação natural e acessibilidade.
          </Text>

          <TouchableOpacity style={styles.mainButton} onPress={() => router.push("/screens/cam")}>
            <MaterialIcons name="videocam" size={20} color="#00363d" />
            <Text style={styles.buttonText}>Iniciar câmera</Text>
          </TouchableOpacity>
        </View>

        {/* Cards */}
        <View style={styles.grid}>
          {/* Card ML */}
          <TouchableOpacity style={styles.cardLarge} activeOpacity={0.8}>
            <Text style={styles.cardTitle}>
              Reconhecimento por Machine Learning
            </Text>
            <Text style={styles.cardText}>
              Modelos neurais para identificar gestos com alta precisão.
            </Text>
          </TouchableOpacity>

          {/* Card Gestos */}
          <TouchableOpacity style={styles.card} activeOpacity={0.8}>
            <MaterialIcons name="gesture" size={30} color="#f2e9ff" />
            <Text style={styles.cardTitle}>Gestos Dinâmicos</Text>
            <Text style={styles.cardTextSmall}>
              Detecção de movimentos e trajetórias.
            </Text>
          </TouchableOpacity>

          {/* Card Regras */}
          <TouchableOpacity style={styles.card} activeOpacity={0.8}>
            <MaterialIcons name="terminal" size={30} color="#00e5ff" />
            <Text style={styles.cardTitle}>Baseado em Regras</Text>
            <Text style={styles.cardTextSmall}>
              Lógica baseada nos landmarks.
            </Text>
          </TouchableOpacity>

          {/* Libras */}
          <TouchableOpacity style={styles.cardWide} activeOpacity={0.8}>
            <MaterialIcons name="sign-language" size={30} color="#b9c7e4" />
            <View>
              <Text style={styles.cardTitle}>Libras</Text>
              <Text style={styles.cardTextSmall}>
                Tradução em tempo real (experimental)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logoText: {
    color: "#dfe2eb",
    fontSize: 20,
    fontWeight: "bold",
  },

  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  content: {
    padding: 16,
    paddingBottom: 10,
  },

  hero: {
    marginBottom: 24,
  },

  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },

  subtitle: {
    color: "#bac9cc",
    marginVertical: 12,
  },

  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00e5ff",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#00e5ff",
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  buttonText: {
    fontWeight: "bold",
    color: "#00363d",
  },

  grid: {
    gap: 16,
  },

  cardLarge: {
    backgroundColor: "#1c2026",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  card: {
    backgroundColor: "#262a31",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  cardWide: {
    backgroundColor: "#181c22",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 8,
  },

  cardText: {
    color: "#aaa",
    marginTop: 4,
  },

  cardTextSmall: {
    color: "#aaa",
    fontSize: 12,
  },

  pipeline: {
    marginTop: 32,
  },

  pipelineTitle: {
    color: "#888",
    marginBottom: 12,
  },

  tags: {
    flexDirection: "row",
    gap: 8,
  },

  tag: {
    backgroundColor: "#0a0e14",
    padding: 8,
    borderRadius: 20,
  },

  tagText: {
    color: "#00e5ff",
    fontSize: 12,
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 70,
    backgroundColor: "#10141a",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  navItem: {
    alignItems: "center",
  },

  navItemActive: {
    alignItems: "center",
  },

  navText: {
    color: "#aaa",
    fontSize: 10,
  },

  navTextActive: {
    color: "#00e5ff",
    fontSize: 10,
  },
});