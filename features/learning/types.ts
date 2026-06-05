export type LearningLevel = "iniciante" | "intermediario" | "avancado";

export interface Gesture {
  id: string;
  name: string;
  level: LearningLevel;
  category: string;
  module: string;
  description: string;
  svgInitial: string;
  svgMovement: string;
  svgFinal: string;
}

export interface GestureProgress {
  progress: number;
  learned: boolean;
}

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
