import { StyleSheet } from "react-native";
import { AppColors, AppRadius, AppSpacing } from "@/constants/theme";

export const levelsInfoStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.backgroundAlt },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: AppSpacing.xl,
    paddingHorizontal: AppSpacing.xl,
    gap: 15,
  },
  backBtn: {
    padding: AppSpacing.sm,
    borderRadius: AppRadius.sm,
    backgroundColor: AppColors.surface,
  },
  title: { fontSize: 22, fontWeight: "800", color: AppColors.text.primary },
  scrollContent: { padding: AppSpacing.xl, paddingBottom: 40 },
  subtitle: {
    fontSize: 15,
    color: AppColors.text.secondary,
    lineHeight: 22,
    marginBottom: 30,
  },
  levelCard: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xxl,
    padding: AppSpacing.xl,
    marginBottom: AppSpacing.xl,
    borderWidth: 1,
  },
  levelCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 12,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: AppRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  levelTextContainer: { flex: 1 },
  levelTitle: { fontSize: AppSpacing.xl, fontWeight: "800" },
  levelRange: {
    fontSize: 12,
    color: "#697688",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
  levelDesc: {
    fontSize: 14,
    color: AppColors.text.alt,
    lineHeight: AppSpacing.xl,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: AppSpacing.xl,
    paddingHorizontal: AppSpacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: "#697688",
    textAlign: "center",
    flex: 1,
  },
});
