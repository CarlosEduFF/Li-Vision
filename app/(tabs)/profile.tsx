import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../services/i18n";
import { Modal, ScrollView as RNScrollView } from "react-native";

function ProfileScreen() {
  const [userName, setUserName] = useState("Usuário");
  const [userRole, setUserRole] = useState("member");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<any>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const handleSelectLanguage = (code: string) => {
    changeLanguage(code);
    setLangModalVisible(false);
  };

  // Recarrega os dados toda vez que a tela recebe foco (ex: voltando de edit-profile)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const name = await AsyncStorage.getItem("userName");
      const role = await AsyncStorage.getItem("userRole");
      const id = await AsyncStorage.getItem("userId");
      const avatar = await AsyncStorage.getItem("userAvatar");
      
      setUserName(name || t('profile.default_user'));
      setUserRole(role || "member");
      setAvatarUrl(avatar || null);

      // Buscar pontuação
      if (id) {
        const data = await trainingService.getRanking();
        if (data && data.ranking) {
          const userItem = data.ranking.find((r: any) => String(r.user_id) === String(id));
          setMyRank(userItem || { samples: 0, rankNum: 0 });
        }
      }

      // Buscar dados frescos do servidor (avatar atualizado, etc)
      try {
        const profileRes = await trainingService.getProfile();
        if (profileRes.ok && profileRes.profile) {
          const p = profileRes.profile;
          if (p.full_name) {
            setUserName(p.full_name);
            await AsyncStorage.setItem("userName", p.full_name);
          }
          if (p.avatar_url) {
            setAvatarUrl(p.avatar_url);
            await AsyncStorage.setItem("userAvatar", p.avatar_url);
          }
        }
      } catch { /* silencioso — usa cached */ }
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
    if (samples >= 20000) return { title: t("profile.levels.champion"), color: "#E91E63", icon: "trophy" };
    if (samples >= 10000) return { title: t("profile.levels.legend"), color: "#9C27B0", icon: "fire" };
    if (samples >= 5000) return { title: t("profile.levels.specialist"), color: "#3F51B5", icon: "medal" };
    if (samples >= 1001) return { title: t("profile.levels.expert"), color: "#FF5722", icon: "user-graduate" };
    if (samples > 500) return { title: t("profile.levels.master"), color: "#ffdf00", icon: "crown" };
    if (samples > 100) return { title: t("profile.levels.fluent"), color: "#00e5ff", icon: "shield-alt" };
    if (samples > 10) return { title: t("profile.levels.apprentice"), color: "#4caf50", icon: "seedling" };
    return { title: t("profile.levels.beginner"), color: "#888", icon: "user-clock" };
  };

  const levelInfo = getLevel(myRank ? myRank.samples : 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <TouchableOpacity style={styles.langBtn} onPress={() => setLangModalVisible(true)}>
          <MaterialIcons name="language" size={20} color="#00e5ff" />
          <Text style={styles.langText}>{i18n.language.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 50 }} />
      ) : (
        <>
          <View style={styles.profileCard}>
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push("/screens/edit-profile")}
              activeOpacity={0.8}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <FontAwesome5 name="user-astronaut" size={40} color="#00e5ff" />
              )}
               {userRole === "admin" && (
                 <View style={styles.adminBadge}>
                   <MaterialIcons name="admin-panel-settings" size={14} color="#000" />
                 </View>
               )}
               {/* Badge de editar */}
               <View style={styles.editAvatarBadge}>
                 <MaterialIcons name="edit" size={12} color="#fff" />
               </View>
            </TouchableOpacity>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.role}>{userRole === "admin" ? t('profile.role_admin') : t('profile.role_member')}</Text>
            
            {/* Botão editar perfil */}
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push("/screens/edit-profile")}
            >
              <MaterialIcons name="edit" size={16} color="#00e5ff" />
              <Text style={styles.editProfileBtnText}>{t('profile.edit_profile')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>{t('profile.contributions')}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{myRank ? myRank.samples : 0}</Text>
                <Text style={styles.statLabel}>{t('profile.donated_frames')}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity 
                style={styles.statBox} 
                onPress={() => router.push("/screens/levels-info")}
                activeOpacity={0.7}
              >
                <FontAwesome5 name={levelInfo.icon} size={24} color={levelInfo.color} style={{marginBottom: 5}} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={[styles.statValue, { color: levelInfo.color, fontSize: 18 }]}>{levelInfo.title}</Text>
                  <MaterialIcons name="info-outline" size={12} color={levelInfo.color} style={{ opacity: 0.6 }} />
                </View>
                <Text style={styles.statLabel}>{t('profile.current_level')}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.rankingBtn} onPress={() => router.push("/screens/ranking")}>
               <Text style={styles.rankingBtnText}>{t('profile.view_ranking')}</Text>
               <MaterialIcons name="chevron-right" size={20} color="#00e5ff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.aboutBtn} onPress={() => router.push("/screens/about")}>
               <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                 <MaterialIcons name="info-outline" size={20} color="#888" />
                 <Text style={styles.aboutBtnText}>{t('profile.about_app')}</Text>
               </View>
               <MaterialIcons name="chevron-right" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={22} color="#ff4444" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modal de Idioma */}
      <Modal transparent visible={langModalVisible} animationType="fade">
        <TouchableOpacity 
          style={styles.modalBg} 
          activeOpacity={1} 
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.langModal}>
            <Text style={styles.modalTitle}>{t('profile.language')}</Text>
            {languages.map((lang) => (
              <TouchableOpacity 
                key={lang.code}
                style={[
                  styles.langItem, 
                  i18n.language === lang.code && styles.langItemActive
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.langName,
                  i18n.language === lang.code && styles.langNameActive
                ]}>
                  {lang.name}
                </Text>
                {i18n.language === lang.code && (
                  <MaterialIcons name="check" size={20} color="#00e5ff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 60 },
  header: { marginBottom: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff" },
  langBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0, 229, 255, 0.1)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)" },
  langText: { color: "#00e5ff", fontWeight: "700", fontSize: 14 },
  profileCard: { alignItems: "center", backgroundColor: "#1c2026", padding: 30, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.15)" },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(0, 229, 255, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 15, position: "relative", overflow: "visible" },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: "#00e5ff" },
  adminBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#ffdf00", width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#1c2026" },
  editAvatarBadge: { position: "absolute", top: -2, right: -2, backgroundColor: "rgba(0, 229, 255, 0.8)", width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#1c2026" },
  name: { fontSize: 22, color: "#fff", fontWeight: "700", marginBottom: 5 },
  role: { fontSize: 14, color: "#888", fontWeight: "600", marginBottom: 16 },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0, 229, 255, 0.1)", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)" },
  editProfileBtnText: { color: "#00e5ff", fontWeight: "700", fontSize: 13 },
  statsCard: { backgroundColor: "#1c2026", borderRadius: 20, padding: 20 },
  statsTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 20 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { color: "#00e5ff", fontSize: 32, fontWeight: "800", marginBottom: 5 },
  statLabel: { color: "#888", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  divider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.05)" },
  rankingBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 229, 255, 0.1)", padding: 15, borderRadius: 12, gap: 5, marginBottom: 12 },
  rankingBtnText: { color: "#00e5ff", fontWeight: "bold" },
  aboutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255, 255, 255, 0.03)", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.05)" },
  aboutBtnText: { color: "#888", fontWeight: "600", fontSize: 14 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 15, backgroundColor: "rgba(255, 68, 68, 0.1)", gap: 10, alignSelf:"center", width:"100%", marginBottom: 30, borderWidth: 1, borderColor: "rgba(255, 68, 68, 0.3)" },
  logoutText: { color: "#ff4444", fontWeight: "bold", fontSize: 16 },
  // Modal Idioma
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  langModal: { width: "80%", maxWidth: 300, backgroundColor: "#1c2026", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  langItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, marginBottom: 8, gap: 12 },
  langItemActive: { backgroundColor: "rgba(0, 229, 255, 0.1)" },
  langFlag: { fontSize: 20 },
  langName: { flex: 1, color: "#888", fontSize: 16, fontWeight: "600" },
  langNameActive: { color: "#fff" },
});

export default ProfileScreen;
