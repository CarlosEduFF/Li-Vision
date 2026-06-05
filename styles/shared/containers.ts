import { StyleSheet } from "react-native";
import { AppColors, AppRadius, AppShadow, AppSpacing } from "@/constants/theme";

export const containers = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  screenAlt: {
    flex: 1,
    backgroundColor: AppColors.backgroundAlt,
  },
  screenPadded: {
    flex: 1,
    backgroundColor: AppColors.background,
    padding: AppSpacing.xl,
    paddingTop: 50,
  },
  screenPaddedAlt: {
    flex: 1,
    backgroundColor: AppColors.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    padding: AppSpacing.xl,
  },
  scrollContent: {
    padding: AppSpacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: AppSpacing.xl,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
});
