import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Text from "@/components/TranslatableText";
import { AppColors } from "@/constants/theme";
import type { RankingEntry } from "@/features/ranking/types";

type Props = {
  ranking: RankingEntry[];
};

type PodiumItemProps = {
  entry: RankingEntry;
  position: 1 | 2 | 3;
};

const PODIUM_CONFIG = {
  1: {
    color: AppColors.podium.gold,
    gradientColors: [AppColors.podium.gold, AppColors.podium.goldDark] as [string, string],
    height: 60,
    size: 36,
    borderRadius: 18,
    icon: "emoji-events" as const,
    iconSize: 20,
  },
  2: {
    color: AppColors.podium.silver,
    gradientColors: [AppColors.podium.silver, AppColors.podium.silverDark] as [string, string],
    height: 40,
    size: 28,
    borderRadius: 14,
    icon: "person" as const,
    iconSize: 16,
  },
  3: {
    color: AppColors.podium.bronze,
    gradientColors: [AppColors.podium.bronze, AppColors.podium.bronzeDark] as [string, string],
    height: 30,
    size: 28,
    borderRadius: 14,
    icon: "person" as const,
    iconSize: 16,
  },
} as const;

function PodiumItem({ entry, position }: PodiumItemProps) {
  const config = PODIUM_CONFIG[position];
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
  if (ranking.length === 0) return null;

  return (
    <View style={styles.podiumRow}>
      {ranking[1] && <PodiumItem entry={ranking[1]} position={2} />}
      {ranking[0] && <PodiumItem entry={ranking[0]} position={1} />}
      {ranking[2] && <PodiumItem entry={ranking[2]} position={3} />}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  podiumName: {
    color: "#dfe2eb",
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
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});
