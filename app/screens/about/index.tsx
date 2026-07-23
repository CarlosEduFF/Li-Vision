import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import AboutModal from "@/components/AboutModal";
import { useTranslation } from "react-i18next";
import { makeAboutStyles as makeStyles } from "@/styles/about.styles";
import { useAppTheme } from "@/context/ThemeContext";

export default function AboutScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);
  const { t } = useTranslation();

  const openModal = (slide: number) => {
    setActiveSlide(slide);
    setModalVisible(true);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <MaterialIcons name="tune" size={28} color={colors.primary} />
          <Text style={styles.title}>{t('about.title')}</Text>
        </View>

        <Text style={styles.subtitle}>
          {t('about.subtitle')}
        </Text>

        {/* CARD INFO ARQUITETURA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="cloud-done" size={20} color={colors.accent.green} />
            <Text style={styles.sectionTitle}>{t('about.multi_session')}</Text>
          </View>
          <Text style={styles.infoText}>
            {t('about.multi_session_desc')}
          </Text>
          <View style={styles.tipBox}>
            <MaterialIcons name="lightbulb-outline" size={18} color={colors.accent.warning} />
            <Text style={styles.tipText}>
              {t('about.tip')}
            </Text>
          </View>
        </View>

        {/* CARD AÃ‡Ã•ES RÃPIDAS - 4 BOTÃ•ES COM MODAIS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="flash-on" size={20} color={colors.text.primary} />
            <Text style={styles.sectionTitle}>{t('about.guide')}</Text>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(1)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="dashboard" size={22} color={colors.primary} />
              <View>
                <Text style={styles.actionLabel}>{t('about.guide_presentation')}</Text>
                <Text style={styles.actionDesc}>{t('about.guide_presentation_desc')}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(2)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="videocam" size={22} color={colors.primary} />
              <View>
                <Text style={styles.actionLabel}>{t('about.guide_inference')}</Text>
                <Text style={styles.actionDesc}>{t('about.guide_inference_desc')}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(3)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="science" size={22} color={colors.primary} />
              <View>
                <Text style={styles.actionLabel}>{t('about.guide_train')}</Text>
                <Text style={styles.actionDesc}>{t('about.guide_train_desc')}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(4)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="leaderboard" size={22} color={colors.primary} />
              <View>
                <Text style={styles.actionLabel}>{t('about.guide_ranking')}</Text>
                <Text style={styles.actionDesc}>{t('about.guide_ranking_desc')}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* CARD VERSÃƒO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info-outline" size={20} color={colors.text.primary} />
            <Text style={styles.sectionTitle}>{t('about.about_app')}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{t('about.version')}</Text>
            <Text style={styles.versionValue}>1.0.0 â€” Multi-Tenant</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{t('about.api')}</Text>
            <Text style={styles.versionValue}>Li-Vision Â· Render</Text>
          </View>
          <View style={[styles.versionRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.versionLabel}>{t('about.architecture')}</Text>
            <Text style={styles.versionValue}>Edge + Cloud Hybrid</Text>
          </View>
        </View>
      </ScrollView>

      <AboutModal
        visible={modalVisible}
        slide={activeSlide}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

