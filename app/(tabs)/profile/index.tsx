import React, { useMemo, useState, useCallback, useEffect } from "react";
import { View, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, Image, InteractionManager } from "react-native";
import Text from "@/components/TranslatableText";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import { makeProfileStyles as makeStyles } from "@/styles/profile.styles";
import { changeLanguage } from "@/services/i18n";
import { VLibrasController } from "@/components/GlobalVLibras";
import { Modal, ScrollView as RNScrollView } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

const languages = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

function ProfileScreen() {
  const { colors, scheme, setScheme, isSystemControlled } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [userName, setUserName] = useState("Usuário");
  const [userRole, setUserRole] = useState("member");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<any>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [changingLang, setChangingLang] = useState(false);
  const { t, i18n } = useTranslation();
  // Trava síncrona: durante a troca, o re-render de i18n bloqueia o thread
  // e toques extras eram descartados/enfileirados ("cliquei várias vezes").
  // O ref ignora toques repetidos sem depender de re-render de estado.
  const switchingLangRef = React.useRef(false);

  // O botão flutuante do VLibras (bottom/right, zIndex alto) fica por cima dos
  // itens inferiores do modal (fr/ja/es) e capturava os toques. Esconde-o
  // enquanto o modal de idioma estiver aberto.
  useEffect(() => {
    VLibrasController.setButtonHidden(langModalVisible);
    return () => VLibrasController.setButtonHidden(false);
  }, [langModalVisible]);

  const handleSelectLanguage = (code: string) => {
    if (switchingLangRef.current) return;
    // Fecha o modal imediatamente (feedback instantâneo).
    setLangModalVisible(false);
    if (code === i18n.language) return;
    switchingLangRef.current = true;
    // Overlay de loading — gestão de expectativa para o usuário enquanto
    // a troca de idioma aplica (idiomas com texto maior/CJK demoram mais).
    // Mantido visível por um tempo mínimo para não parecer um flash.
    const overlayShownAt = Date.now();
    setChangingLang(true);
    const MIN_OVERLAY_MS = 400;
    // Só troca o idioma depois que a animação de fechamento termina — a troca
    // re-renderiza o app inteiro; no mesmo frame do toque ela trava o gesto.
    InteractionManager.runAfterInteractions(() => {
      changeLanguage(code).finally(() => {
        switchingLangRef.current = false;
        const elapsed = Date.now() - overlayShownAt;
        const remaining = Math.max(0, MIN_OVERLAY_MS - elapsed);
        setTimeout(() => setChangingLang(false), remaining);
      });
    });
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
    <>
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
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.langBtn} onPress={() => setLangModalVisible(true)}>
            <MaterialIcons name="language" size={20} color={colors.primary} />
            <Text style={styles.langText}>{i18n.language.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
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
                <FontAwesome5 name="user-astronaut" size={40} color={colors.primary} />
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
            
            {/* Botão Admin Config (apenas se for admin) */}
            {userRole === "admin" && (
              <TouchableOpacity
                style={styles.adminLinkBtn}
                onPress={() => router.push("/screens/admin-config")}
              >
                <MaterialIcons name="admin-panel-settings" size={20} color={colors.accent.error} />
                <Text style={styles.adminLinkText}>{t('profile.admin.title')}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.accent.error} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push("/screens/edit-profile")}
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
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
               <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.aboutBtn} onPress={() => router.push("/screens/about")}>
               <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                 <MaterialIcons name="info-outline" size={20} color={colors.text.tertiary} />
                 <Text style={styles.aboutBtnText}>{t('profile.about_app')}</Text>
               </View>
               <MaterialIcons name="chevron-right" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={22} color={colors.accent.danger} />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </>
      )}
    </RNScrollView>

      {/* Modal de Idioma — fora da ScrollView para não disputar gestos */}
      <Modal
        transparent
        visible={langModalVisible}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.langModal}>
                <Text style={styles.modalTitleText}>{t('profile.language')}</Text>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    activeOpacity={0.6}
                    style={[
                      styles.langItem,
                      i18n.language === lang.code && styles.langItemActive,
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
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Overlay durante a troca de idioma — cobre o congelamento do re-render */}
      <Modal transparent visible={changingLang} animationType="fade">
        <View style={styles.langLoadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.langLoadingText}>{t('profile.language')}...</Text>
        </View>
      </Modal>
    </>
  );
}


export default ProfileScreen;



