import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppSpacing } from "@/constants/theme";

export function makeLevelsInfoStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
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
    backgroundColor: colors.surface,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text.primary },
  scrollContent: { padding: AppSpacing.xl, paddingBottom: 40 },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 30,
  },
  levelCard: {
    backgroundColor: colors.surface,
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
    color: colors.text.alt,
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
}

export const levelsInfoStyles = makeLevelsInfoStyles;
