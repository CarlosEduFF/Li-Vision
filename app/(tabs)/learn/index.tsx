import { getLearningGestures, LearningGestureApi } from "@/services/api";
import {
  getLevelProgress,
  LearningLevel,
  LEVEL_META,
} from "@/services/learningService";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { TouchableOpacity, ScrollView, View } from "react-native";
import Text from "@/components/TranslatableText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { makeLearnStyles as makeStyles } from "@/styles/learn.styles";
import { useAppTheme } from "@/context/ThemeContext";

type LevelProgress = { total: number; learned: number; percent: number };

const LEVELS: LearningLevel[] = ["iniciante", "intermediario", "avancado"];

export default function LearnTabScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [progress, setProgress] = useState<Record<LearningLevel, LevelProgress>>({
    iniciante: { total: 0, learned: 0, percent: 0 },
    intermediario: { total: 0, learned: 0, percent: 0 },
    avancado: { total: 0, learned: 0, percent: 0 },
  });

  const [selectedModule, setSelectedModule] = useState<string>("Libras");
  const [role, setRole] = useState<string>("member");
  const [gestures, setGestures] = useState<LearningGestureApi[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const isAdmin = useMemo(() => role === "admin", [role]);

  const modules = useMemo(() => {
    const list = Array.from(new Set(gestures.map(g => g.module || "Libras")));
    return list.length > 0 ? list : ["Libras"];
  }, [gestures]);

  useEffect(() => {
    if (modules.length > 0 && !modules.includes(selectedModule)) {
      setSelectedModule(modules[0]);
    }
  }, [modules, selectedModule]);

  const loadProgress = useCallback(async () => {
    const [i, m, a] = await Promise.all([
      getLevelProgress("iniciante", selectedModule),
      getLevelProgress("intermediario", selectedModule),
      getLevelProgress("avancado", selectedModule),
    ]);
    setProgress({
      iniciante: i,
      intermediario: m,
      avancado: a,
    });
  }, [selectedModule]);

  const loadGestures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getLearningGestures();
      setGestures(res.items || []);
    } catch (error) {
      console.log("Erro ao carregar gestos", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
      loadGestures();
    }, [loadProgress, loadGestures])
  );

  useEffect(() => {
    const loadRole = async () => {
      const storedRole = await AsyncStorage.getItem("userRole");
      setRole(storedRole || "member");
    };
    loadRole();
  }, []);



  // Group gestures: level -> category -> count
  const groupedGestures = useMemo(() => {
    const group: Record<string, Record<string, number>> = {
      iniciante: {},
      intermediario: {},
      avancado: {},
    };

    gestures
      .filter((g) => (g.module || "Libras") === selectedModule)
      .forEach((g) => {
        if (!group[g.level]) group[g.level] = {};
        if (!group[g.level][g.category]) {
          group[g.level][g.category] = 0;
        }
        group[g.level][g.category]++;
      });

    return group;
  }, [gestures, selectedModule]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#10141a" }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{t('learn.title')}</Text>
              <Text style={styles.subtitle}>
                {t('learn.subtitle')}
              </Text>
            </View>
          </View>
        </View>

        {/* Module Selector */}
        <View style={styles.moduleSelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleScroll}>
            {modules.map(mod => (
              <TouchableOpacity 
                key={mod} 
                style={[styles.moduleBtn, selectedModule === mod && styles.moduleBtnActive]}
                onPress={() => setSelectedModule(mod)}
              >
                <Text style={[styles.moduleBtnText, selectedModule === mod && styles.moduleBtnTextActive]}>{mod}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push('/screens/manage-learning' as any)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="admin-panel-settings" size={20} color="#081018" />
            <Text style={styles.adminBtnText}>{t('learn.admin_btn')}</Text>
          </TouchableOpacity>
        )}

        {LEVELS.map((level) => {
          const meta = LEVEL_META[level];
          const p = progress[level];
          const categories = Object.keys(groupedGestures[level] || {});

          return (
            <View key={level} style={styles.levelSection}>
              <View style={styles.levelHeader}>
                <View style={styles.levelTitleContainer}>
                  <MaterialIcons name={meta.icon as any} size={24} color={meta.color} />
                  <Text style={[styles.levelTitle, { color: meta.color }]}>
                    {t(`learn.levels.${level}.title`)}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t(`learn.levels.${level}.range`)}</Text>
                </View>
              </View>

              <Text style={styles.levelSubtitle}>{t(`learn.levels.${level}.subtitle`)}</Text>

              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{p.percent}%</Text>
                <Text style={styles.progressDetail}>
                  {t('learn.learned_count', { count: p.learned })}
                </Text>
              </View>

              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${p.percent}%`, backgroundColor: meta.color }]} />
              </View>

              {loading ? (
                <Text style={styles.loadingText}>{t('learn.loading')}</Text>
              ) : categories.length === 0 ? (
                <Text style={styles.emptyText}>{t('learn.empty')}</Text>
              ) : (
                <View style={styles.categoriesContainer}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryCard, { borderLeftColor: meta.color }]}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: "/screens/gesture-detail" as any,
                          params: { level, category: cat, module: selectedModule },
                        })
                      }
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.categoryTitle}>{cat}</Text>
                        <Text style={styles.categoryCount}>
                          {t(groupedGestures[level][cat] === 1 ? 'learn.gesture_count_one' : 'learn.gesture_count_other', { count: groupedGestures[level][cat] })}
                        </Text>
                      </View>
                      <View style={styles.playBtn}>
                        <MaterialIcons name="play-arrow" size={20} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={18} color="#8a92a3" />
          <Text style={styles.noteText}>
            {t('learn.note')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



