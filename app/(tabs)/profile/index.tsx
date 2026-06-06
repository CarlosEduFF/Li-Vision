import React, { useMemo, useState, useCallback } from "react";
import { View, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import Text from "@/components/TranslatableText";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import { makeProfileStyles as makeStyles } from "@/styles/profile.styles";
import { changeLanguage } from "@/services/i18n";
import { Modal, ScrollView as RNScrollView } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

function ProfileScreen() {
  const { colors, scheme, setScheme, isSystemControlled } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [userName, setUserName] = useState("UsuÃ¡rio");
  const [userRole, setUserRole] = useState("member");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<any>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'pt', name: 'PortuguÃªs', flag: 'ðŸ‡§ðŸ‡·' },
    { code: 'en', name: 'English', flag: 'ðŸ‡ºðŸ‡¸' },
    { code: 'de', name: 'Deutsch', flag: 'ðŸ‡©ðŸ‡ª' },
    { code: 'fr', name: 'FranÃ§ais', flag: 'ðŸ‡«ðŸ‡·' },
    { code: 'ja', name: 'æ—¥æœ¬èªž', flag: 'ðŸ‡¯ðŸ‡µ' },
    { code: 'es', name: 'EspaÃ±ol', flag: 'ðŸ‡ªðŸ‡¸' },
  ];

  const handleSelectLanguage = (code: string) => {
    changeLanguage(code);
    setLangModalVisible(false);
  };

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

      if (id) {
        const data = await trainingService.getRanking();
        if (data && data.ranking) {
          const userItem = data.ranking.find((r: any) => String(r.user_id) === String(id));
          setMyRank(userItem || { samples: 0, rankNum: 0 });
        }
      }

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
      } catch { /* use cached */ }
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
    <RNScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setScheme(scheme === "dark" ? "light" : "dark")}
          >
            <MaterialIcons
              name={scheme === "dark" ? "light-mode" : "dark-mode"}
              size={20}
              color="#00e5ff"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.langBtn} onPress={() => setLangModalVisible(true)}>
            <MaterialIcons name="language" size={20} color="#00e5ff" />
            <Text style={styles.langText}>{i18n.language.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 50 }} />
      ) : (
        <>
          <View style={styles.profileCard}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push("/screens/edit-profile")}
              activeOpacity={0.8}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <FontAwesome5 name="user-astronaut" size={40} color="#00e5ff" />
              )}
               {userRole === "admin" && (
                 <View style={styles.adminBadge}>
                   <MaterialIcons name="admin-panel-settings" size={14} color="#000" />
                 </View>
               )}
               <View style={styles.editAvatarBadge}>
                 <MaterialIcons name="edit" size={12} color="#fff" />
               </View>
            </TouchableOpacity>
            <Text style={styles.nameText}>{userName}</Text>
            <Text style={styles.roleText}>{userRole === "admin" ? t('profile.role_admin') : t('profile.role_member')}</Text>
            
            {/* BotÃ£o Admin Config (apenas se for admin) */}
            {userRole === "admin" && (
              <TouchableOpacity
                style={styles.adminLinkBtn}
                onPress={() => router.push("/screens/admin-config")}
              >
                <MaterialIcons name="admin-panel-settings" size={20} color="#ff6b6b" />
                <Text style={styles.adminLinkText}>{t('profile.admin.title')}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#ff6b6b" />
              </TouchableOpacity>
            )}

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
                <Text style={styles.statValueText}>{myRank ? myRank.samples : 0}</Text>
                <Text style={styles.statLabelText}>{t('profile.donated_frames')}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity 
                style={styles.statBox} 
                onPress={() => router.push("/screens/levels-info")}
                activeOpacity={0.7}
              >
                <FontAwesome5 name={levelInfo.icon} size={24} color={levelInfo.color} style={{marginBottom: 5}} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={[styles.statValueText, { color: levelInfo.color, fontSize: 18 }]}>{levelInfo.title}</Text>
                  <MaterialIcons name="info-outline" size={12} color={levelInfo.color} style={{ opacity: 0.6 }} />
                </View>
                <Text style={styles.statLabelText}>{t('profile.current_level')}</Text>
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
            <Text style={styles.modalTitleText}>{t('profile.language')}</Text>
            {languages.map((lang) => (
              <TouchableOpacity 
                key={lang.code}
                style={[
                  styles.langItem, 
                  i18n.language === lang.code && styles.langItemActive
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={lang.code === i18n.language ? styles.langFlagActive : styles.langFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.langNameText,
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
    </RNScrollView>
  );
}


export default ProfileScreen;



