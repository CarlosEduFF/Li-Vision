import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { makeStudioStyles as makeStyles } from "@/styles/studio.styles";
import { useAppTheme } from "@/context/ThemeContext";

export default function StudioScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const checkRole = async () => {
      const role = await AsyncStorage.getItem("userRole");
      setIsAdmin(role === "admin");
    };
    checkRole();
  }, []);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <MaterialIcons name="dashboard" size={28} color={colors.primary} />
        <Text style={styles.title}>{t('studio.title')}</Text>
      </View>

      <Text style={styles.subtitle}>
        {t('studio.subtitle')}
      </Text>

      {/* CARD â€” Coleta de Dados */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="backup" size={20} color={colors.text.primary} />
          <Text style={styles.sectionTitle}>
            {isAdmin ? t('studio.section_data') : t('studio.section_data_user')}
          </Text>
        </View>
        {!isAdmin && (
          <Text style={styles.collaboratorHint}>
            {t('studio.collaborator_hint')}
          </Text>
        )}
        <View style={styles.optionsGrid}>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/collect-static")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="camera" size={22} color={colors.text.secondary} />
              <Text style={styles.optionText}>{t('studio.static_collection')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/collect-dynamic")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="videocam" size={22} color={colors.text.secondary} />
              <Text style={styles.optionText}>{t('studio.dynamic_collection')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/manage-datasets")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="folder-open" size={22} color={isAdmin ? colors.text.secondary : colors.text.secondary} />
              <Text style={[styles.optionText, isAdmin && { color: colors.text.secondary }]}>
                {isAdmin ? t('studio.manage_datasets') : t('studio.view_datasets')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* CARD NAVIGATION */}
      {isAdmin && (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="model-training" size={20} color={colors.text.primary} />
          <Text style={styles.sectionTitle}>{t('studio.section_models')}</Text>
        </View>
        <View style={styles.optionsGrid}>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/train")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="bolt" size={22} color={colors.text.secondary} />
              <Text style={styles.optionText}>{t('studio.start_training')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => router.push("/screens/models")}
          >
            <View style={styles.optionContent}>
              <MaterialIcons name="list" size={22} color={colors.text.secondary} />
              <Text style={styles.optionText}>{t('studio.manage_models')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      )}
    </ScrollView>
  );
}



