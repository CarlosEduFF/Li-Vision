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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trainingService } from "@/services/trainingService";

export default function HomeScreen() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [activeModelName, setActiveModelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      // Primeiro tenta carregar do AsyncStorage (cached)
      const name = await AsyncStorage.getItem("userName");
      const avatar = await AsyncStorage.getItem("userAvatar");
      const model = await AsyncStorage.getItem("activeModelName");
      
      if (name) setFullName(name);
      if (avatar) setAvatarUrl(avatar);
      if (model) setActiveModelName(model);

      // Busca os dados frescos do servidor
      const [res, rankRes] = await Promise.all([
        trainingService.getProfile(),
        trainingService.getRanking()
      ]);

      if (res.ok && res.profile) {
        setFullName(res.profile.full_name || "");
        setAvatarUrl(res.profile.avatar_url || null);
      }

      if (rankRes.ok && rankRes.ranking) {
        setRanking(rankRes.ranking.slice(0, 5)); // Apenas top 5
      }
    } catch (e) {
      console.log("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
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

          {/* Ranking Compacto */}
          <View style={styles.rankingContainer}>
            <View style={styles.rankingHeader}>
              <Text style={styles.rankingTitle}>Top Contribuidores</Text>
              <TouchableOpacity onPress={() => router.push("/ranking")}>
                <Text style={styles.seeAllText}>Ver tudo</Text>
              </TouchableOpacity>
            </View>

            {/* Triade (Podium) */}
            {ranking.length > 0 && (
              <View style={styles.podiumRow}>
                {/* Silver - 2nd */}
                {ranking[1] && (
                  <View style={styles.podiumItem}>
                    <View style={[styles.avatarMini, { borderColor: "#c0c0c0", borderWidth: 2 }]}>
                      <MaterialIcons name="person" size={16} color="#c0c0c0" />
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{ranking[1].name}</Text>
                    <LinearGradient colors={["#c0c0c0", "#8e8e8e"]} style={[styles.podiumBox, { height: 40 }]}>
                      <Text style={styles.podiumRank}>2</Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Gold - 1st */}
                {ranking[0] && (
                  <View style={styles.podiumItem}>
                    <View style={[styles.avatarMini, { borderColor: "#ffd700", borderWidth: 2, width: 36, height: 36, borderRadius: 18 }]}>
                      <MaterialIcons name="emoji-events" size={20} color="#ffd700" />
                    </View>
                    <Text style={[styles.podiumName, { fontWeight: "800", color: "#ffd700" }]} numberOfLines={1}>{ranking[0].name}</Text>
                    <LinearGradient colors={["#ffd700", "#b8860b"]} style={[styles.podiumBox, { height: 60 }]}>
                      <Text style={styles.podiumRank}>1</Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Bronze - 3rd */}
                {ranking[2] && (
                  <View style={styles.podiumItem}>
                    <View style={[styles.avatarMini, { borderColor: "#cd7f32", borderWidth: 2 }]}>
                      <MaterialIcons name="person" size={16} color="#cd7f32" />
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{ranking[2].name}</Text>
                    <LinearGradient colors={["#cd7f32", "#8b4513"]} style={[styles.podiumBox, { height: 30 }]}>
                      <Text style={styles.podiumRank}>3</Text>
                    </LinearGradient>
                  </View>
                )}
              </View>
            )}

            {/* Demais (4th and 5th) */}
            <View style={styles.othersList}>
              {ranking.slice(3, 5).map((item, index) => (
                <View key={index} style={styles.rankRow}>
                  <View style={styles.rankLeft}>
                    <Text style={styles.rankNum}>{index + 4}</Text>
                    <View style={styles.avatarMini}>
                      <MaterialIcons name="person" size={14} color="#00e5ff" />
                    </View>
                    <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <Text style={styles.rankPoints}>{item.samples} pts</Text>
                </View>
              ))}
            </View>
          </View>
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
  rankingContainer: {
    backgroundColor: "#1c2026",
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.1)",
  },
  rankingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rankingTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  seeAllText: {
    color: "#00e5ff",
    fontSize: 12,
    fontWeight: "600",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    borderRadius: 12,
  },
  rankLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rankNum: {
    color: "#555",
    fontWeight: "bold",
    width: 20,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  rankName: {
    color: "#dfe2eb",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  rankPoints: {
    color: "#00e5ff",
    fontSize: 13,
    fontWeight: "bold",
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  podiumItem: {
    alignItems: "center",
    width: "28%",
  },
  podiumName: {
    color: "#dfe2eb",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  podiumBox: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRank: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  othersList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 16,
  },
});