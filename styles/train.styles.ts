import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppShadow, AppSpacing } from "@/constants/theme";

export function makeTrainStyles(colors: AppColorTokens) {
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
    marginBottom: AppSpacing.xl,
  },
  title: { fontSize: 24, fontWeight: "bold", color: colors.text.primary },
  form: { gap: 15 },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: AppSpacing.sm,
  },
  tabActive: { backgroundColor: "rgba(0, 229, 255, 0.15)" },
  tabText: { color: colors.text.secondary, fontWeight: "bold", fontSize: 13 },
  tabTextActive: { color: colors.primary },
  label: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.primary,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.cyan,
    fontSize: 18,
    fontWeight: "bold",
  },
  modelsScroll: { flexGrow: 0, marginBottom: 5 },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
  },
  chipText: { color: colors.text.secondary, fontWeight: "bold" },
  chipTextActive: { color: colors.primary },
  dsButton: {
    padding: AppSpacing.xl,
    backgroundColor: colors.surface,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  dsButtonActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0, 229, 255, 0.05)",
  },
  captureBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: AppSpacing.xl,
    borderRadius: AppRadius.sm,
    gap: 10,
    marginTop: AppSpacing.xl,
    ...AppShadow.cyan,
  },
  captureBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  statusBox: {
    marginTop: AppSpacing.xl,
    padding: AppSpacing.xl,
    backgroundColor: colors.surface,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
});
}

export const trainStyles = makeTrainStyles;
