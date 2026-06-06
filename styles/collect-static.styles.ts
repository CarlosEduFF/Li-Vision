import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppSpacing } from "@/constants/theme";

export function makeCollectStaticStyles(colors: AppColorTokens) {
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
  cameraContainer: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
    marginBottom: AppSpacing.xl,
  },
  permissionBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  landmarkDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  form: { gap: 15 },
  label: { color: colors.text.secondary, fontSize: 14, fontWeight: "bold" },
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
  buttonRow: { flexDirection: "column", gap: 10, marginTop: 10 },
  captureBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  captureBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  finalizeBtn: {
    backgroundColor: colors.accent.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  finalizeBtnText: { color: colors.text.primary, fontWeight: "bold", fontSize: 16 },
  stats: { color: colors.text.secondary, textAlign: "center", marginTop: 10 },
  chipScroll: { marginBottom: 10 },
  chip: {
    backgroundColor: "#262a31",
    paddingHorizontal: 15,
    paddingVertical: AppSpacing.sm,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0, 229, 255, 0.15)",
  },
  chipText: { color: colors.text.secondary, fontWeight: "bold" },
  chipTextActive: { color: colors.primary },
  labelHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppSpacing.sm,
    backgroundColor: "rgba(255, 171, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.2)",
    borderRadius: 10,
    padding: 12,
    marginTop: -5,
  },
  labelHintText: {
    color: colors.accent.warning,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
});
}

export const collectStaticStyles = makeCollectStaticStyles;
