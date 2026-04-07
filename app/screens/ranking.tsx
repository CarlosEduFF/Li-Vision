import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { trainingService } from "../../services/trainingService";

export default function RankingScreen() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const data = await trainingService.getRanking();
        if (data && data.ranking) {
          setRanking(data.ranking);
        }
      } catch (e) {
        console.log("Erro loading ranking", e);
      } finally {
        setLoading(false);
      }
    };
    loadRanking();
  }, []);

  const renderPodiumItem = (item: any, position: number) => {
    if (!item) return <View style={styles.podiumEmpty} />;
    
    let height = position === 1 ? 160 : position === 2 ? 120 : 100;
    let colors = position === 1 ? ["#ffdf00", "#d4af37"] : position === 2 ? ["#e0e0e0", "#a9a9a9"] : ["#cd7f32", "#8b4513"];

    return (
      <View style={[styles.podiumCol, { zIndex: position === 1 ? 2 : 1 }]}>
        <Text style={styles.podiumName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.podiumSamples}>{item.samples} pts</Text>
        <LinearGradient
          colors={colors as [string, string]}
          style={[styles.podiumBox, { height }]}
        >
          <Text style={styles.podiumRank}>{position}</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderItem = ({ item, index }: any) => {
    if (index < 3) return null; // Top 3 already in podium

    return (
      <View style={styles.rankRow}>
        <View style={styles.rankLeft}>
          <Text style={styles.rankNum}>{index + 1}</Text>
          <View style={styles.avatarMini}>
            <FontAwesome5 name="user-astronaut" size={14} color="#00e5ff" />
          </View>
          <Text style={styles.rankRowName}>{item.name}</Text>
        </View>
        <LinearGradient colors={["rgba(0, 229, 255, 0.2)", "rgba(0, 229, 255, 0.0)"]} style={styles.pointsBadge}>
          <Text style={styles.rankRowPoints}>{item.samples} frames</Text>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)/studio")}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Global Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 50 }} />
      ) : (
        <>
          <Text style={styles.subtitle}>
            Os pesquisadores que mais contribuíram treinando a IA do Li-Vision Edge.
          </Text>

          {/* Podium for top 3 */}
          {ranking.length > 0 && (
            <View style={styles.podiumContainer}>
              {renderPodiumItem(ranking[1], 2)}
              {renderPodiumItem(ranking[0], 1)}
              {renderPodiumItem(ranking[2], 3)}
            </View>
          )}

          {/* Remaining List */}
          <FlatList
            data={ranking}
            keyExtractor={(it, idx) => idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0e14", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1c2026", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#ffffff" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 30, paddingHorizontal: 20 },
  
  podiumContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 220,
    marginBottom: 30,
    gap: 10
  },
  podiumCol: {
    alignItems: "center",
    width: "30%",
  },
  podiumName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center"
  },
  podiumSamples: {
    color: "#00e5ff",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10
  },
  podiumBox: {
    width: "100%",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 15,
    shadowColor: "#ffdf00",
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  podiumEmpty: { width: "30%" },

  listContent: {
    paddingBottom: 40
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c2026",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)"
  },
  rankLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  rankNum: {
    color: "#555",
    fontSize: 16,
    fontWeight: "800",
    width: 20
  },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)"
  },
  rankRowName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600"
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)"
  },
  rankRowPoints: {
    color: "#00e5ff",
    fontSize: 13,
    fontWeight: "700"
  }
});
