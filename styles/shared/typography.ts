import { StyleSheet } from "react-native";
import { AppColors } from "@/constants/theme";

export const typography = StyleSheet.create({
  screenTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: AppColors.text.primary,
    letterSpacing: -0.5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: AppColors.text.primary,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: AppColors.text.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AppColors.text.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.text.secondary,
    lineHeight: 20,
  },
  subtitleCenter: {
    fontSize: 13,
    color: AppColors.text.secondary,
    textAlign: "center" as const,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.text.muted,
    lineHeight: 22,
    marginBottom: 16,
  },
  caption: {
    fontSize: 13,
    color: AppColors.text.tertiary,
    flex: 1,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    color: AppColors.text.secondary,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  primaryValue: {
    color: AppColors.primary,
    fontWeight: "600" as const,
    fontSize: 14,
  },
});
