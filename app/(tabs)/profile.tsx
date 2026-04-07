import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { trainingService } from "@/services/trainingService";

export default function ProfileScreen() {
  const [userName, setUserName] = useState("Usuário");
  const [userRole, setUserRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const name = await AsyncStorage.getItem("userName");
      const role = await AsyncStorage.getItem("userRole");
      const id = await AsyncStorage.getItem("userId");
      
      setUserName(name || "Colaborador");
      setUserRole(role || "member");

      // Buscar pontuação
      if (id) {
        const data = await trainingService.getRanking();
        if (data && data.ranking) {
          const userItem = data.ranking.find((r: any) => String(r.user_id) === String(id));
          setMyRank(userItem || { samples: 0, rankNum: 0 });
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    router.replace("/screens/login");
  };

  const getLevel = (samples: number) => {
    if (samples > 500) return { title: "Mestre", color: "#ffdf00", icon: "crown" };
    if (samples > 100) return { title: "Fluente", color: "#00e5ff", icon: "shield-alt" };
    if (samples > 10) return { title: "Aprendiz", color: "#4caf50", icon: "seedling" };
    return { title: "Iniciante", color: "#888", icon: "user-clock" };
  };

  const levelInfo = getLevel(myRank ? myRank.samples : 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Minha Conta</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 50 }} />
      ) : (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
               <FontAwesome5 name="user-astronaut" size={40} color="#00e5ff" />
               {userRole === "admin" && (
                 <View style={styles.adminBadge}>
                   <MaterialIcons name="admin-panel-settings" size={14} color="#000" />
                 </View>
               )}
            </View>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.role}>{userRole === "admin" ? "Chefe / Administrador" : "Colaborador"}</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Suas Contribuições</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{myRank ? myRank.samples : 0}</Text>
                <Text style={styles.statLabel}>Frames Doados</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <FontAwesome5 name={levelInfo.icon} size={24} color={levelInfo.color} style={{marginBottom: 5}} />
                <Text style={[styles.statValue, { color: levelInfo.color, fontSize: 18 }]}>{levelInfo.title}</Text>
                <Text style={styles.statLabel}>Seu Nível Atual</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.rankingBtn} onPress={() => router.push("/screens/ranking")}>
               <Text style={styles.rankingBtnText}>Ver Ranking Geral</Text>
               <MaterialIcons name="chevron-right" size={20} color="#00e5ff" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={22} color="#ff4444" />
            <Text style={styles.logoutText}>Encerrar Sessão</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 60 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff" },
  profileCard: { alignItems: "center", backgroundColor: "#1c2026", padding: 30, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.15)" },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(0, 229, 255, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 15, position: "relative" },
  adminBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#ffdf00", width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#1c2026" },
  name: { fontSize: 22, color: "#fff", fontWeight: "700", marginBottom: 5 },
  role: { fontSize: 14, color: "#888", fontWeight: "600" },
  statsCard: { backgroundColor: "#1c2026", borderRadius: 20, padding: 20 },
  statsTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 20 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { color: "#00e5ff", fontSize: 32, fontWeight: "800", marginBottom: 5 },
  statLabel: { color: "#888", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  divider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.05)" },
  rankingBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 229, 255, 0.1)", padding: 15, borderRadius: 12, gap: 5 },
  rankingBtnText: { color: "#00e5ff", fontWeight: "bold" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 15, backgroundColor: "rgba(255, 68, 68, 0.1)", gap: 10, alignSelf:"center", width:"100%", marginBottom: 30, borderWidth: 1, borderColor: "rgba(255, 68, 68, 0.3)" },
  logoutText: { color: "#ff4444", fontWeight: "bold", fontSize: 16 }
});
