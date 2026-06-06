import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { APP_LEVELS } from "@/constants/levels";
import { useTranslation } from "react-i18next";
import { levelsInfoStyles as styles } from "@/styles/levels-info.styles";

export default function LevelsInfoScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('levels_info.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          {t('levels_info.subtitle')}
        </Text>

        {APP_LEVELS.map((level, index) => (
          <View key={index} style={[styles.levelCard, { borderColor: level.color + "44" }]}>
            <View style={styles.levelCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: level.color + "22" }]}>
                <FontAwesome5 name={level.icon} size={24} color={level.color} />
              </View>
              <View style={styles.levelTextContainer}>
                <Text style={[styles.levelTitle, { color: level.color }]}>{t(`profile.levels.${level.id}`)}</Text>
                <Text style={styles.levelRange}>
                  {index === 0 ? `${t('levels_info.above_500').replace('500', level.minSamples.toString())}` : 
                   `${level.minSamples} ${t('levels_info.to')} ${APP_LEVELS[index - 1].minSamples - 1}`} {t('levels_info.frames')}
                </Text>
              </View>
            </View>
            <Text style={styles.levelDesc}>{t(`profile.levels.${level.id}_desc`)}</Text>
          </View>
        ))}

        <View style={styles.footerInfo}>
          <MaterialIcons name="info-outline" size={18} color="#697688" />
          <Text style={styles.footerText}>
            {t('levels_info.footer')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}



