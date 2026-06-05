import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import Text from "@/components/TranslatableText";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { homeStyles as styles } from "./index.styles";
import { useProfile } from "@/features/profile/useProfile";
import { PodiumDisplay } from "@/components/ranking/PodiumDisplay";

export default function HomeScreen() {
  const router = useRouter();
  const { fullName, avatarUrl, activeModelName, ranking, isLoading, refresh } = useProfile();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Image source={require('../../assets/images/Li-Vision-Logo-BackgroundOff.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
          </View>
          <Text style={styles.logoText}>{fullName}</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity>
            <MaterialIcons name="notifications" size={24} color="#dfe2eb" />
          </TouchableOpacity>

          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <FontAwesome5 name="user-astronaut" size={40} color="#00e5ff" />
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.title}>Li-Vision</Text>

          <Text style={styles.subtitle}>
            {t('home.subtitle')}
          </Text>

          <TouchableOpacity style={styles.mainButton} onPress={() => router.push("/screens/cam")}>
            <MaterialIcons name="videocam" size={20} color="#00363d" />
            <Text style={styles.buttonText}>{t('home.start_camera')}</Text>
          </TouchableOpacity>
        </View>

        {/* Cards */}
        <View style={styles.grid}>
          
          {/* Selecionar Modelo / Idioma */}
          <TouchableOpacity style={styles.cardWide} activeOpacity={0.8} onPress={() => router.push("/screens/select-model")}>
            <MaterialIcons name="language" size={34} color="#b388ff" />
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={[styles.cardTitle, { color: "#b388ff" }]}>{t('home.base_language')}</Text>
                <Text style={styles.cardTextSmall}>
                  {t('home.selected')}{activeModelName || t('home.default')}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#b388ff" />
            </View>
          </TouchableOpacity>

          {/* Ranking Compacto */}
          <TouchableOpacity style={styles.rankingContainer} activeOpacity={0.85} onPress={() => router.push("/screens/ranking")}>
            <View style={styles.rankingHeader}>
              <Text style={styles.rankingTitle}>{t('home.top_contributors')}</Text>
              <TouchableOpacity onPress={() => router.push("/screens/ranking")} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.seeAllText}>{t('home.see_all')}</Text>
              </TouchableOpacity>
            </View>

            {/* Triade (Podium) */}
            <PodiumDisplay ranking={ranking} />

            {/* Demais (4th and 5th) */}
            <View style={styles.othersList}>
              {ranking.slice(3, 5).map((item, index) => (
                <View key={index} style={styles.rankRow}>
                  <View style={styles.rankLeft}>
                    <Text style={styles.rankNum}>{index + 4}</Text>
                    <View style={styles.avatarMini}>
                      <MaterialIcons name="person" size={14} color="#00e5ff" />
                    </View>
                    <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <Text style={styles.rankPoints}>{item.samples} pts</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


