import { StyleSheet } from "react-native";
import { AppColors, AppRadius, AppSpacing } from "@/constants/theme";

export const selectModelStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundAlt,
    padding: AppSpacing.xl,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.sm,
    backgroundColor: AppColors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "800", color: AppColors.text.primary },
  subtitle: {
    fontSize: 14,
    color: AppColors.text.secondary,
    marginBottom: 30,
    lineHeight: 20,
  },
  list: { gap: 16 },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { color: AppColors.text.secondary, fontSize: 16, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    padding: AppSpacing.xl,
    borderRadius: AppRadius.xxl,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardActive: {
    borderColor: "rgba(179, 136, 255, 0.4)",
    backgroundColor: "rgba(179, 136, 255, 0.05)",
  },
  cardIndicator: { marginRight: AppSpacing.xl },
  cardContent: { flex: 1 },
  modelName: {
    color: AppColors.text.primary,
    fontWeight: "700",
    fontSize: 20,
    marginBottom: 4,
  },
  modelNameActive: { color: AppColors.accent.purple },
  modelStatus: { color: AppColors.text.tertiary, fontSize: 12 },
});
