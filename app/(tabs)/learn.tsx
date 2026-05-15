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
import { TouchableOpacity, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type LevelProgress = { total: number; learned: number; percent: number };

const LEVELS: LearningLevel[] = ["iniciante", "intermediario", "avancado"];

export default function LearnTabScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<Record<LearningLevel, LevelProgress>>({
    iniciante: { total: 0, learned: 0, percent: 0 },
    intermediario: { total: 0, learned: 0, percent: 0 },
    avancado: { total: 0, learned: 0, percent: 0 },
  });

  const [role, setRole] = useState<string>("member");
  const [gestures, setGestures] = useState<LearningGestureApi[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const isAdmin = useMemo(() => role === "admin", [role]);

  const loadProgress = useCallback(async () => {
    const [i, m, a] = await Promise.all([
      getLevelProgress("iniciante"),
      getLevelProgress("intermediario"),
      getLevelProgress("avancado"),
    ]);
    setProgress({
      iniciante: i,
      intermediario: m,
      avancado: a,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  useEffect(() => {
    const loadRole = async () => {
      const storedRole = await AsyncStorage.getItem("userRole");
      setRole(storedRole || "member");
    };
    loadRole();
  }, []);

  useEffect(() => {
    // Load gestures to group them by categories
    const loadGestures = async () => {
      try {
        setLoading(true);
        const res = await getLearningGestures();
        setGestures(res.items || []);
      } catch (error) {
        console.log("Erro ao carregar gestos", error);
      } finally {
        setLoading(false);
      }
    };
    loadGestures();
  }, []);

  // Group gestures: level -> category -> count
  const groupedGestures = useMemo(() => {
    const group: Record<string, Record<string, number>> = {
      iniciante: {},
      intermediario: {},
      avancado: {},
    };

    gestures.forEach((g) => {
      if (!group[g.level]) group[g.level] = {};
      if (!group[g.level][g.category]) {
        group[g.level][g.category] = 0;
      }
      group[g.level][g.category]++;
    });

    return group;
  }, [gestures]);

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
                          params: { level, category: cat },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 16,
    marginTop: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: "#b8c0cc",
    marginTop: 8,
    lineHeight: 20,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#00e5ff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  adminBtnText: {
    color: "#081018",
    fontWeight: "800",
    fontSize: 14,
  },
  levelSection: {
    backgroundColor: "#151a22",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232a35",
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  levelTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badgeText: {
    color: "#8a92a3",
    fontSize: 10,
    fontWeight: "800",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
    marginTop: 8,
  },
  progressText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  progressDetail: {
    color: "#8a92a3",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  levelTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  levelSubtitle: {
    color: "#9cadc3",
    fontSize: 13,
    marginTop: 2,
  },
  barBg: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "#2a2f3a",
    overflow: "hidden",
    marginBottom: 16,
  },
  barFill: {
    height: 6,
    borderRadius: 99,
  },
  loadingText: {
    color: "#8a92a3",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },
  emptyText: {
    color: "#8a92a3",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },
  categoriesContainer: {
    gap: 10,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2230",
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  categoryTitle: {
    color: "#eaf0fa",
    fontSize: 15,
    fontWeight: "700",
  },
  categoryCount: {
    color: "#8a92a3",
    fontSize: 12,
    marginTop: 2,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#151a22",
    padding: 12,
    borderRadius: 12,
  },
  noteText: {
    color: "#8a92a3",
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
