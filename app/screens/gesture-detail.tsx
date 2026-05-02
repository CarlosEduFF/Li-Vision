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
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  const params = useLocalSearchParams<{ level?: string; category?: string }>();
  const level: LearningLevel = isLearningLevel(params.level || "")
    ? (params.level as LearningLevel)
    : "iniciante";

  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, GestureProgress>>({});

    async function loadData() {
      try {
        const [items, pMap] = await Promise.all([
          getGesturesByLevel(level),
          getProgressMap(),
        ]);
        if (mounted) {
          setProgressMap(pMap);
          if (params.category) {
            setGestures(items.filter(g => g.category === params.category));
          } else {
            setGestures(items);
          }
        }
      } catch (error) {
        console.log("Erro ao carregar dados:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [level, params.category]);

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
        <Text style={styles.title}>{params.category ? `${params.category}` : meta.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Biblioteca de gestos • Faixa {meta.range}</Text>

        {loading ? (
          <Text style={styles.loadingText}>Carregando gestos...</Text>
        ) : gestures.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="search-off" size={24} color="#8a92a3" />
            <Text style={styles.emptyText}>Nenhum gesto disponível neste nível.</Text>
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
                  {meta.title}
                </Text>
              </View>

              <Text style={styles.category}>{gesture.category}</Text>
              <Text style={styles.desc}>{gesture.description}</Text>

              <View style={styles.stepsRow}>
                <View style={styles.stepBox}>
                  <Text style={styles.stepTitle}>1. Inicial</Text>
                  <View style={styles.placeholder}>
                    {gesture.svgInitial ? (
                      <Image source={{ uri: gesture.svgInitial }} style={styles.previewImage} />
                    ) : (
                      <MaterialIcons name="pan-tool" size={26} color="#9aa4b2" />
                    )}
                  </View>
                </View>

                <View style={styles.stepBox}>
                  <Text style={styles.stepTitle}>2. Movimento</Text>
                  <View style={styles.placeholder}>
                    {gesture.svgMovement ? (
                      <Image source={{ uri: gesture.svgMovement }} style={styles.previewImage} />
                    ) : (
                      <MaterialIcons name="gesture" size={26} color="#9aa4b2" />
                    )}
                  </View>
                </View>

                <View style={styles.stepBox}>
                  <Text style={styles.stepTitle}>3. Final</Text>
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
                  {progressMap[gesture.id]?.learned ? "Revisar Novamente" : "Concluir Aprendizado"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.footerNote}>
          <MaterialIcons name="image" size={16} color="#8a92a3" />
          <Text style={styles.footerText}>Somente ilustrações SVG (sem vídeo).</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a" },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1b212a",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  subtitle: { color: "#aeb8c7", marginBottom: 10 },
  loadingText: { color: "#aeb8c7" },
  emptyBox: {
    backgroundColor: "#151a22",
    borderWidth: 1,
    borderColor: "#2b3442",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  emptyText: { color: "#8a92a3" },
  card: {
    backgroundColor: "#1a1f28",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  letter: { color: "#fff", fontSize: 22, fontWeight: "700" },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  category: { color: "#8f98a8", marginTop: 6, fontSize: 12 },
  desc: { color: "#c1c9d6", marginTop: 8, marginBottom: 10 },
  stepsRow: { flexDirection: "row", gap: 8 },
  stepBox: { flex: 1 },
  stepTitle: { color: "#8f98a8", fontSize: 12, marginBottom: 6 },
  placeholder: {
    height: 78,
    backgroundColor: "#11161d",
    borderWidth: 1,
    borderColor: "#2b3442",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  footerNote: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#151a22",
    padding: 10,
    borderRadius: 10,
  },
  footerText: { color: "#8a92a3", fontSize: 12 },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#00d084",
    alignItems: "center",
    justifyContent: "center",
  },
  learnBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  unlearnedBtn: {
    backgroundColor: "#00e5ff",
  },
  learnedBtn: {
    backgroundColor: "rgba(138, 146, 163, 0.1)",
    borderWidth: 1,
    borderColor: "#3a475c",
  },
  learnBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  unlearnedBtnText: {
    color: "#081018",
  },
  learnedBtnText: {
    color: "#8a92a3",
  },
});
