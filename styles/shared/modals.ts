import { StyleSheet } from "react-native";
import { AppColors, AppRadius, AppSpacing } from "@/constants/theme";

export const modals = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: AppSpacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: AppColors.text.primary,
    marginBottom: AppSpacing.md,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.text.muted,
    textAlign: "center" as const,
    marginBottom: AppSpacing.xxxl,
    lineHeight: 22,
  },
});
