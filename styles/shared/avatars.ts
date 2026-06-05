import { StyleSheet } from "react-native";
import { AppColors, AppShadow, AppSpacing } from "@/constants/theme";

export const avatars = StyleSheet.create({
  circle: {
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  sm: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  md: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  lg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center" as const,
    marginBottom: AppSpacing.xl,
  },
  xl: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 15,
  },
  xxl: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: AppColors.primary,
  },
  placeholderXxl: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AppColors.surface,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: AppColors.border.cyanStrong,
    borderStyle: "dashed" as const,
  },
  editBadge: {
    position: "absolute" as const,
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 3,
    borderColor: AppColors.background,
    ...AppShadow.cyan,
  },
});
