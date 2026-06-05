import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLearningGestures, LearningGestureApi } from "@/services/api";
import type { Gesture, GestureProgress, LearningLevel } from "./types";

export type { Gesture, GestureProgress, LearningLevel };
export { LEVEL_META } from "./types";

const STORAGE_KEY = "learning_progress_v1";

function mapApiGesture(item: LearningGestureApi): Gesture {
  return {
    id: item.id,
    name: item.name,
    level: item.level,
    category: item.category,
    module: item.module || "Libras",
    description: item.description,
    svgInitial: item.svg_initial || "",
    svgMovement: item.svg_movement || "",
    svgFinal: item.svg_final || "",
  };
}

export async function getAllGestures(module?: string): Promise<Gesture[]> {
  try {
    const response = await getLearningGestures({ module });
    if (response.ok && Array.isArray(response.items)) {
      return response.items.map(mapApiGesture);
    }
    return [];
  } catch (error) {
    console.log("Falha ao carregar gestos da API:", error);
    return [];
  }
}

export async function getProgressMap(): Promise<Record<string, GestureProgress>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.log("Erro ao carregar progresso de aprendizagem:", error);
    return {};
  }
}

export async function saveProgressMap(
  progressMap: Record<string, GestureProgress>
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap));
  } catch (error) {
    console.log("Erro ao salvar progresso de aprendizagem:", error);
  }
}

export async function markGestureProgress(
  gestureId: string,
  progress: number
): Promise<void> {
  const normalized = Math.max(0, Math.min(100, progress));
  const current = await getProgressMap();
  current[gestureId] = {
    progress: normalized,
    learned: normalized >= 90,
  };
  await saveProgressMap(current);
}

export async function getGesturesByLevel(
  level: LearningLevel,
  module?: string
): Promise<Gesture[]> {
  const all = await getAllGestures(module);
  return all.filter((g) => g.level === level);
}

export async function getLevelProgress(
  level: LearningLevel,
  module?: string
): Promise<{ total: number; learned: number; percent: number }> {
  const gestures = await getGesturesByLevel(level, module);
  const progressMap = await getProgressMap();

  const learnedCount = gestures.filter((g) => progressMap[g.id]?.learned).length;
  const total = gestures.length;
  const percent = total === 0 ? 0 : Math.round((learnedCount / total) * 100);

  return { total, learned: learnedCount, percent };
}
