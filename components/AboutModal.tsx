import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import Carousel from "react-native-reanimated-carousel";
import { AppColorTokens } from "@/constants/theme";
import { useAppTheme } from "@/context/ThemeContext";


const { width, height: screenHeight } = Dimensions.get("window");
const CAROUSEL_WIDTH = width - 60;

type CarouselSlide = {
  title: string;
  items: string[];
};

type ModalContent = {
  titleKey: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  image: any;
  slides: string[];
};

const modalsData: Record<string, ModalContent> = {
  "1": {
    titleKey: "about_modal.1.title",
    icon: "dashboard",
    image: require("../assets/images/Li-Vision-Logo-BackgroundOff.png"),
    slides: ["overview", "home", "camera", "studio", "ranking", "profile"],
  },
  "2": {
    titleKey: "about_modal.2.title",
    icon: "videocam",
    image: require("../assets/images/li-vision-logo-icon.png"),
    slides: ["access_camera", "position_hand", "select_mode", "detection_modes", "usage_tips"],
  },
  "3": {
    titleKey: "about_modal.3.title",
    icon: "science",
    image: require("../assets/images/li-vision-logo-icon.png"),
    slides: ["data_collection", "create_dataset", "organize_data", "training", "use_model"],
  },
  "4": {
    titleKey: "about_modal.4.title",
    icon: "leaderboard",
    image: require("../assets/images/li-vision-logo-icon.png"),
    slides: ["scoring", "point_sources", "ranking_system", "benefits", "ranking_tips"],
  },
};

type AboutModalProps = {
  visible: boolean;
  slide: number;
  onClose: () => void;
};

export default function AboutModal({ visible, slide, onClose }: AboutModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useTranslation();
  const modalId = modalsData[String(slide)] ? String(slide) : "1";
  const modalData = modalsData[modalId];
  const translatedSlides: CarouselSlide[] = modalData.slides.map((slideKey) => {
    const baseKey = `about_modal.${modalId}.slides.${slideKey}`;
    const items = t(`${baseKey}.items`, { returnObjects: true });

    return {
      title: t(`${baseKey}.title`),
      items: Array.isArray(items) ? items.map(String) : [],
    };
  });

  useEffect(() => {
    if (visible) {
      setActiveIndex(0);
    }
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.titleRow}>
              <MaterialIcons name={modalData.icon} size={32} color={colors.primary} />
              <Text style={styles.title}>{t(modalData.titleKey)}</Text>
            </View>
          </View>

          <Image source={modalData.image} style={styles.image} resizeMode="contain" />

          <View style={styles.carouselContainer}>
            <Carousel
              width={CAROUSEL_WIDTH}
              height={380}
              data={translatedSlides}
              onSnapToItem={(index) => setActiveIndex(index)}
              renderItem={({ item, index }) => (
                <View style={styles.slideCard}>
                  <View style={styles.slideHeader}>
                    <View style={styles.slideNumber}>
                      <Text style={styles.slideNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.slideTitle}>{item.title}</Text>
                  </View>
                  <View style={styles.itemsContainer}>
                    {item.items.map((text, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <MaterialIcons name="check-circle" size={18} color={colors.accent.green} />
                        <Text style={styles.itemText}>{text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            />
          </View>

          <View style={styles.dotsContainer}>
            {translatedSlides.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeIndex === index && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "92%",
    maxHeight: "95%",
    minHeight: screenHeight * 0.88,
    backgroundColor: colors.background,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.cyanMedium,
    elevation: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.cyanMedium,
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    paddingRight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text.primary,
    flex: 1,
  },
  image: {
    width: "100%",
    height: 120,
    marginVertical: 20,
  },
  carouselContainer: {
    flex: 1,
    alignItems: "center",
  },
  slideCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border.cyanMedium,
    height: 360,
  },
  slideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  slideNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  slideNumberText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    flex: 1,
  },
  itemsContainer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemText: {
    fontSize: 14,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border.subtle,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  });
}
