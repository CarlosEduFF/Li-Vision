import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Text from "@/components/TranslatableText";
import { AppColorTokens } from "@/constants/theme";
import { useAppTheme } from "@/context/ThemeContext";
import type { RankingEntry } from "@/features/ranking/types";

type Props = {
  ranking: RankingEntry[];
};

type PodiumItemProps = {
  entry: RankingEntry;
  position: 1 | 2 | 3;
  colors: AppColorTokens;
  styles: ReturnType<typeof makeStyles>;
};

function makePodiumConfig(colors: AppColorTokens) {
  return {
    1: {
      color: colors.podium.gold,
      gradientColors: [colors.podium.gold, colors.podium.goldDark] as [string, string],
      height: 60,
      size: 36,
      borderRadius: 18,
      icon: "emoji-events" as const,
      iconSize: 20,
    },
    2: {
      color: colors.podium.silver,
      gradientColors: [colors.podium.silver, colors.podium.silverDark] as [string, string],
      height: 40,
      size: 28,
      borderRadius: 14,
      icon: "person" as const,
      iconSize: 16,
    },
    3: {
      color: colors.podium.bronze,
      gradientColors: [colors.podium.bronze, colors.podium.bronzeDark] as [string, string],
      height: 30,
      size: 28,
      borderRadius: 14,
      icon: "person" as const,
      iconSize: 16,
    },
  } as const;
}

function PodiumItem({ entry, position, colors, styles }: PodiumItemProps) {
  const config = makePodiumConfig(colors)[position];
  return (
    <View style={styles.podiumItem}>
      <View
        style={[
          styles.avatarMini,
          {
            borderColor: config.color,
            borderWidth: 2,
            width: config.size,
            height: config.size,
            borderRadius: config.borderRadius,
          },
        ]}
      >
        <MaterialIcons name={config.icon} size={config.iconSize} color={config.color} />
      </View>
      <Text
        style={[
          styles.podiumName,
          position === 1 && { fontWeight: "800", color: config.color },
        ]}
        numberOfLines={1}
      >
        {entry.name}
      </Text>
      <LinearGradient
        colors={config.gradientColors}
        style={[styles.podiumBox, { height: config.height }]}
      >
        <Text style={styles.podiumRank}>{position}</Text>
      </LinearGradient>
    </View>
  );
}

export function PodiumDisplay({ ranking }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (ranking.length === 0) return null;

  return (
    <View style={styles.podiumRow}>
      {ranking[1] && <PodiumItem entry={ranking[1]} position={2} colors={colors} styles={styles} />}
      {ranking[0] && <PodiumItem entry={ranking[0]} position={1} colors={colors} styles={styles} />}
      {ranking[2] && <PodiumItem entry={ranking[2]} position={3} colors={colors} styles={styles} />}
    </View>
  );
}

function makeStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  podiumItem: {
    alignItems: "center",
    width: "28%",
  },
  avatarMini: {
    backgroundColor: colors.border.cyan,
    justifyContent: "center",
    alignItems: "center",
  },
  podiumName: {
    color: colors.text.alt,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  podiumBox: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRank: {
    // Fixo: o texto do rank fica sempre sobre o gradiente colorido do pódio, não sobre a superfície do tema.
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  });
}
