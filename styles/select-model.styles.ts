import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppSpacing } from "@/constants/theme";

export function makeSelectModelStyles(colors: AppColorTokens) {
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
    gap: 15,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.text.primary },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 30,
    lineHeight: 20,
  },
  list: { gap: 16 },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 16, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
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
    color: colors.text.primary,
    fontWeight: "700",
    fontSize: 20,
    marginBottom: 4,
  },
  modelNameActive: { color: colors.accent.purple },
  modelStatus: { color: colors.text.tertiary, fontSize: 12 },
});
}

export const selectModelStyles = makeSelectModelStyles;
