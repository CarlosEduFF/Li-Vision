import React, { useMemo, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import { makeRankingStyles as makeStyles } from "@/styles/ranking.styles";
import { useAppTheme } from "@/context/ThemeContext";

export default function RankingScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const data = await trainingService.getRanking();
        if (data && data.ranking) {
          setRanking(data.ranking);
        }
      } catch (e) {
        console.log("Erro loading ranking", e);
      } finally {
        setLoading(false);
      }
    };
    loadRanking();
  }, []);

  const renderPodiumItem = (item: any, position: number) => {
    if (!item) return <View style={styles.podiumEmpty} />;
    
    let height = position === 1 ? 160 : position === 2 ? 120 : 100;
    let colors = position === 1 ? ["#ffdf00", "#d4af37"] : position === 2 ? ["#e0e0e0", "#a9a9a9"] : ["#cd7f32", "#8b4513"];

    return (
      <View style={[styles.podiumCol, { zIndex: position === 1 ? 2 : 1 }]}>
        <Text style={styles.podiumName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.podiumSamples}>{item.samples} {t('ranking.points')}</Text>
        <LinearGradient
          colors={colors as [string, string]}
          style={[styles.podiumBox, { height }]}
        >
          <Text style={styles.podiumRank}>{position}</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderItem = ({ item, index }: any) => {
    if (index < 3) return null; // Top 3 already in podium

    return (
      <View style={styles.rankRow}>
        <View style={styles.rankLeft}>
          <Text style={styles.rankNum}>{index + 1}</Text>
          <View style={styles.avatarMini}>
            <FontAwesome5 name="user-astronaut" size={14} color="#00e5ff" />
          </View>
          <Text style={styles.rankRowName}>{item.name}</Text>
        </View>
        <LinearGradient colors={["rgba(0, 229, 255, 0.2)", "rgba(0, 229, 255, 0.0)"]} style={styles.pointsBadge}>
          <Text style={styles.rankRowPoints}>{item.samples} {t('ranking.frames')}</Text>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('ranking.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 50 }} />
      ) : (
        <>
          <Text style={styles.subtitle}>
            {t('ranking.subtitle')}
          </Text>

          {/* Podium for top 3 */}
          {ranking.length > 0 && (
            <View style={styles.podiumContainer}>
              {renderPodiumItem(ranking[1], 2)}
              {renderPodiumItem(ranking[0], 1)}
              {renderPodiumItem(ranking[2], 3)}
            </View>
          )}

          {/* Remaining List */}
          <FlatList
            data={ranking}
            keyExtractor={(it, idx) => idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}



