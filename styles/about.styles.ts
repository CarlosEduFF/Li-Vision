import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppShadow, AppSpacing } from "@/constants/theme";

export function makeAboutStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    padding: AppSpacing.xl,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 32,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: AppRadius.xxl,
    padding: AppSpacing.xl,
    marginBottom: AppSpacing.xxl,
    borderWidth: 1,
    borderColor: colors.border.cyan,
    ...AppShadow.cyanSubtle,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppSpacing.sm,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.alt,
    lineHeight: 22,
    marginBottom: 16,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255, 171, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.2)",
    borderRadius: AppRadius.sm,
    padding: 12,
  },
  tipText: {
    fontSize: 13,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#262a31",
    padding: AppSpacing.xl,
    borderRadius: AppRadius.md,
    marginBottom: 10,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  actionLabel: { fontSize: 15, fontWeight: "700", color: colors.text.primary },
  actionDesc: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  versionLabel: { fontSize: 14, color: colors.text.secondary },
  versionValue: { fontSize: 14, color: colors.primary, fontWeight: "600" },
});
}

export const aboutStyles = makeAboutStyles;
