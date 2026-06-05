import {
  Gesture,
  getGesturesByLevel,
  LearningLevel,
  LEVEL_META,
  markGestureProgress,
  getProgressMap,
  GestureProgress,
} from "@/services/learningService";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { gestureDetailStyles as styles } from "./gesture-detail.styles";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function isLearningLevel(value: string): value is LearningLevel {
  return value === "iniciante" || value === "intermediario" || value === "avancado";
}

export default function GestureDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; category?: string; module?: string }>();
  const level: LearningLevel = isLearningLevel(params.level || "")
    ? (params.level as LearningLevel)
    : "iniciante";
  const selectedModule = params.module || "Libras";

  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, GestureProgress>>({});
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [items, pMap] = await Promise.all([
        getGesturesByLevel(level, selectedModule),
        getProgressMap(),
      ]);
      setProgressMap(pMap);
      if (params.category) {
        setGestures(items.filter(g => g.category === params.category));
      } else {
        setGestures(items);
      }
    } catch (error) {
      console.log("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [level, params.category]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleLearned = async (gestureId: string) => {
    const currentlyLearned = progressMap[gestureId]?.learned;
    const newProgress = currentlyLearned ? 0 : 100;
    
    await markGestureProgress(gestureId, newProgress);
    const updatedMap = await getProgressMap();
    setProgressMap(updatedMap);
  };

  const meta = useMemo(() => LEVEL_META[level], [level]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color="#d8dee9" />
        </TouchableOpacity>
        <Text style={styles.title}>{params.category ? `${params.category}` : t(`learn.levels.${level}.title`)}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{t('gesture_detail.library', { range: meta.range })}</Text>

        {loading ? (
          <Text style={styles.loadingText}>{t('gesture_detail.loading')}</Text>
        ) : gestures.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="search-off" size={24} color="#8a92a3" />
            <Text style={styles.emptyText}>
              {params.category 
                ? t('gesture_detail.no_gestures_category', { category: params.category }) 
                : t('gesture_detail.no_gestures_level')}
            </Text>
          </View>
        ) : (
          gestures.map((gesture: Gesture) => (
            <View key={gesture.id} style={[
              styles.card,
              progressMap[gesture.id]?.learned && { borderColor: "#00d084", borderWidth: 1.5 }
            ]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.letter}>{gesture.name}</Text>
                  {progressMap[gesture.id]?.learned && (
                    <View style={styles.checkCircle}>
                      <MaterialIcons name="check" size={12} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.levelBadge, { borderColor: meta.color, color: meta.color }]}>
                  {t(`learn.levels.${level}.title`)}
                </Text>
              </View>

              <Text style={styles.category}>{gesture.category}</Text>
              <Text style={styles.desc}>{gesture.description}</Text>

              <View style={styles.stepsRow}>
                <View style={styles.stepBox}>
                  <Text style={styles.stepTitle}>{t('gesture_detail.step_initial')}</Text>
                  <View style={styles.placeholder}>
                    {gesture.svgInitial ? (
                      <Image source={{ uri: gesture.svgInitial }} style={styles.previewImage} />
                    ) : (
                      <MaterialIcons name="pan-tool" size={26} color="#9aa4b2" />
                    )}
                  </View>
                </View>

                <View style={styles.stepBox}>
                  <Text style={styles.stepTitle}>{t('gesture_detail.step_movement')}</Text>
                  <View style={styles.placeholder}>
                    {gesture.svgMovement ? (
                      <Image source={{ uri: gesture.svgMovement }} style={styles.previewImage} />
                    ) : (
                      <MaterialIcons name="gesture" size={26} color="#9aa4b2" />
                    )}
                  </View>
                </View>

                <View style={styles.stepBox}>
                  <Text style={styles.stepTitle}>{t('gesture_detail.step_final')}</Text>
                  <View style={styles.placeholder}>
                    {gesture.svgFinal ? (
                      <Image source={{ uri: gesture.svgFinal }} style={styles.previewImage} />
                    ) : (
                      <MaterialIcons name="front-hand" size={26} color="#9aa4b2" />
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.learnBtn, 
                  progressMap[gesture.id]?.learned ? styles.learnedBtn : styles.unlearnedBtn
                ]}
                onPress={() => toggleLearned(gesture.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons 
                  name={progressMap[gesture.id]?.learned ? "undo" : "check-circle"} 
                  size={18} 
                  color={progressMap[gesture.id]?.learned ? "#8a92a3" : "#081018"} 
                />
                <Text style={[
                  styles.learnBtnText, 
                  progressMap[gesture.id]?.learned ? styles.learnedBtnText : styles.unlearnedBtnText
                ]}>
                  {progressMap[gesture.id]?.learned ? t('gesture_detail.review_btn') : t('gesture_detail.conclude_btn')}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.footerNote}>
          <MaterialIcons name="image" size={16} color="#8a92a3" />
          <Text style={styles.footerText}>{t('gesture_detail.svg_note')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



