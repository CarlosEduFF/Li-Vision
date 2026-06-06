import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppShadow, AppSpacing } from "@/constants/theme";

export function makeStudioStyles(colors: AppColorTokens) {
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
    gap: 10,
    marginBottom: AppSpacing.sm,
  },
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
    lineHeight: AppSpacing.xl,
  },
  collaboratorHint: {
    fontSize: 13,
    color: "#9cadc3",
    marginBottom: 14,
    lineHeight: 19,
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
    marginBottom: AppSpacing.xl,
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
  optionText: { color: colors.text.secondary, fontSize: 15, fontWeight: "600" },
});
}

export const studioStyles = makeStudioStyles;
