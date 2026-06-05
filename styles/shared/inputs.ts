import { StyleSheet } from "react-native";
import { AppColors, AppRadius, AppSpacing } from "@/constants/theme";

export const inputs = StyleSheet.create({
  box: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AppColors.backgroundAlt,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
    marginBottom: 15,
    overflow: "hidden" as const,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AppSpacing.md,
    backgroundColor: AppColors.backgroundAlt,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
    paddingHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.xl,
  },
  icon: {
    padding: 15,
  },
  text: {
    flex: 1,
    color: AppColors.primary,
    fontSize: 16,
    paddingVertical: 15,
    fontWeight: "600" as const,
  },
  fieldLabel: {
    color: AppColors.text.secondary,
    fontSize: 13,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: AppSpacing.md,
  },
});
