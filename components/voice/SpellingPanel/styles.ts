import { StyleSheet } from "react-native";
import { AppColorTokens } from "@/constants/theme";

export function makeSpellingPanelStyles(colors: AppColorTokens) {
  return StyleSheet.create({
    panel: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      borderRadius: 14,
      padding: 12,
      gap: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    title: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    actions: {
      flexDirection: "row",
      gap: 6,
    },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    btnDisabled: {
      opacity: 0.35,
    },
    btnText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "700",
    },
    bufferRow: {
      minHeight: 22,
      justifyContent: "center",
    },
    bufferText: {
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: 2,
    },
    candidate: {
      color: colors.accent.warning,
      fontSize: 14,
      fontWeight: "600",
    },
    placeholder: {
      color: colors.text.secondary,
      fontSize: 12,
      fontStyle: "italic",
    },
    speedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    speedLabel: {
      color: colors.text.muted,
      fontSize: 11,
      flex: 1,
    },
    speedBtn: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    speedValue: {
      color: colors.accent.warning,
      fontSize: 11,
      fontWeight: "700",
      minWidth: 62,
      textAlign: "center",
    },
    speedMs: {
      color: colors.text.tertiary,
      fontSize: 10,
      minWidth: 36,
      textAlign: "right",
    },
    spokenRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: "flex-start",
    },
    spokenText: {
      color: colors.accent.green,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
