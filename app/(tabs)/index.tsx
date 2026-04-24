import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trainingService } from "@/services/trainingService";

export default function HomeScreen() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [activeModelName, setActiveModelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Primeiro tenta carregar do AsyncStorage (cached)
      const name = await AsyncStorage.getItem("userName");
      const avatar = await AsyncStorage.getItem("userAvatar");
      const model = await AsyncStorage.getItem("activeModelName");
      
      if (name) setFullName(name);
      if (avatar) setAvatarUrl(avatar);
      if (model) setActiveModelName(model);

      // Depois busca os dados frescos do servidor
      const res = await trainingService.getProfile();
      if (res.ok && res.profile) {
        setFullName(res.profile.full_name || "");
        setAvatarUrl(res.profile.avatar_url || null);
      }
    } catch (e) {
      console.log("Erro ao carregar perfil:", e);
    } finally {
      setLoading(false);
      console.log(loading);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Image source={require('../../assets/images/Li-Vision-Logo-BackgroundOff.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
          </View>
          <Text style={styles.logoText}>{fullName}</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity>
            <MaterialIcons name="notifications" size={24} color="#dfe2eb" />
          </TouchableOpacity>

          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <FontAwesome5 name="user-astronaut" size={40} color="#00e5ff" />
          )}
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
          
          {/* Selecionar Modelo / Idioma */}
          <TouchableOpacity style={styles.cardWide} activeOpacity={0.8} onPress={() => router.push("/screens/select-model")}>
            <MaterialIcons name="language" size={34} color="#b388ff" />
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={[styles.cardTitle, { color: "#b388ff" }]}>Idioma Base (IA)</Text>
                <Text style={styles.cardTextSmall}>
                  Selecionado: {activeModelName || "Padrão"}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#b388ff" />
            </View>
          </TouchableOpacity>

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
  iconCircle: { width: 40, height: 30, borderRadius: 35, backgroundColor: "rgba(0, 229, 255, 0.1)", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 20, borderWidth: 1, borderColor: "#00e5ff" },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#00e5ff",
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