import { getLearningGestures, LearningGestureApi } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LearningLevel = "iniciante" | "intermediario" | "avancado";

export interface Gesture {
  id: string;
  name: string;
  level: LearningLevel;
  category: string;
  description: string;
  svgInitial: string;
  svgMovement: string;
  svgFinal: string;
}

export interface GestureProgress {
  progress: number; // 0-100
  learned: boolean;
}

const STORAGE_KEY = "learning_progress_v1";

const alphabetLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const ALFABETO_INICIANTE: Gesture[] = alphabetLetters.map((letter) => ({
  id: `alfabeto-${letter}`,
  name: letter,
  level: "iniciante",
  category: "Alfabeto",
  description: `Gesto da letra ${letter} em Libras.`,
  svgInitial: "",
  svgMovement: "",
  svgFinal: "",
}));

const GESTURES_INTERMEDIARIO: Gesture[] = [
  {
    id: "inter-oi",
    name: "Oi",
    level: "intermediario",
    category: "Cumprimentos",
    description: "Saudação informal em Libras.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "inter-tchau",
    name: "Tchau",
    level: "intermediario",
    category: "Cumprimentos",
    description: "Despedida em Libras.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "inter-obrigado",
    name: "Obrigado",
    level: "intermediario",
    category: "Cumprimentos",
    description: "Expressão de agradecimento.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "inter-por-favor",
    name: "Por favor",
    level: "intermediario",
    category: "Expressões",
    description: "Pedido educado em Libras.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "inter-bom-dia",
    name: "Bom dia",
    level: "intermediario",
    category: "Cumprimentos",
    description: "Cumprimento matinal.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
];

const GESTURES_AVANCADO: Gesture[] = [
  {
    id: "ava-como-voce-esta",
    name: "Como você está?",
    level: "avancado",
    category: "Frases",
    description: "Pergunta de interação social.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "ava-preciso-ajuda",
    name: "Preciso de ajuda",
    level: "avancado",
    category: "Frases",
    description: "Solicitação de apoio.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "ava-onde-banheiro",
    name: "Onde é o banheiro?",
    level: "avancado",
    category: "Frases",
    description: "Pergunta de localização comum.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "ava-eu-aprendendo-libras",
    name: "Eu estou aprendendo Libras",
    level: "avancado",
    category: "Frases",
    description: "Frase de contexto de aprendizagem.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
  {
    id: "ava-ate-logo",
    name: "Até logo",
    level: "avancado",
    category: "Cumprimentos",
    description: "Despedida amigável.",
    svgInitial: "",
    svgMovement: "",
    svgFinal: "",
  },
];

export const FALLBACK_GESTURES: Gesture[] = [
  ...ALFABETO_INICIANTE,
  ...GESTURES_INTERMEDIARIO,
  ...GESTURES_AVANCADO,
];

export const LEVEL_META: Record<
  LearningLevel,
  { title: string; subtitle: string; color: string; range: string; icon: string }
> = {
  iniciante: {
    title: "Iniciante",
    subtitle: "Alfabeto completo de A até Z",
    color: "#00e5ff",
    range: "A-Z",
    icon: "looks-one",
  },
  intermediario: {
    title: "Intermediário",
    subtitle: "Cumprimentos e expressões do dia a dia",
    color: "#b388ff",
    range: "Gestos funcionais",
    icon: "looks-two",
  },
  avancado: {
    title: "Avançado",
    subtitle: "Frases completas e contexto de uso",
    color: "#00d084",
    range: "Conversação",
    icon: "looks-3",
  },
};

function mapApiGesture(item: LearningGestureApi): Gesture {
  return {
    id: item.id,
    name: item.name,
    level: item.level,
    category: item.category,
    description: item.description,
    svgInitial: item.svg_initial || "",
    svgMovement: item.svg_movement || "",
    svgFinal: item.svg_final || "",
  };
}

export async function getAllGestures(): Promise<Gesture[]> {
  try {
    const response = await getLearningGestures();
    if (response.ok && Array.isArray(response.items) && response.items.length > 0) {
      return response.items.map(mapApiGesture);
    }
    return FALLBACK_GESTURES;
  } catch (error) {
    console.log("Falha ao carregar gestos da API, usando fallback local:", error);
    return FALLBACK_GESTURES;
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

export async function getGesturesByLevel(level: LearningLevel): Promise<Gesture[]> {
  const all = await getAllGestures();
  return all.filter((g) => g.level === level);
}

export async function getLevelProgress(level: LearningLevel): Promise<{
  total: number;
  learned: number;
  percent: number;
}> {
  const gestures = await getGesturesByLevel(level);
  const progressMap = await getProgressMap();

  const learnedCount = gestures.filter((g) => progressMap[g.id]?.learned).length;
  const total = gestures.length;
  const percent = total === 0 ? 0 : Math.round((learnedCount / total) * 100);

  return {
    total,
    learned: learnedCount,
    percent,
  };
}
