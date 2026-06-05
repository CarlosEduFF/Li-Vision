import { StyleSheet } from "react-native";
import { AppColors, AppRadius, AppShadow, AppSpacing } from "@/constants/theme";

export const studioStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundAlt,
    padding: AppSpacing.xl,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: AppSpacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: AppColors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.text.secondary,
    marginBottom: 32,
    lineHeight: AppSpacing.xl,
  },
  collaboratorHint: {
    fontSize: 13,
    color: "#9cadc3",
    marginBottom: 14,
    lineHeight: 19,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xxl,
    padding: AppSpacing.xl,
    marginBottom: AppSpacing.xxl,
    borderWidth: 1,
    borderColor: AppColors.border.cyan,
    ...AppShadow.cyanSubtle,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.xl,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.text.primary,
    letterSpacing: 0.5,
  },
  optionsGrid: { gap: 12 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#262a31",
    padding: AppSpacing.xl,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionText: { color: AppColors.text.secondary, fontSize: 15, fontWeight: "600" },
});
