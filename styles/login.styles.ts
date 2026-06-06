import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppShadow, AppSpacing } from "@/constants/theme";

export function makeLoginStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    padding: AppSpacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: AppRadius.xxxl,
    padding: AppSpacing.xxxl,
    borderWidth: 1,
    borderColor: colors.border.cyanMedium,
    ...AppShadow.cyanLarge,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: AppSpacing.xl,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: AppSpacing.md,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: AppSpacing.xxxl,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: 15,
    overflow: "hidden",
  },
  icon: { padding: 15 },
  input: {
    flex: 1,
    color: colors.primary,
    fontSize: 16,
    paddingVertical: 15,
    fontWeight: "600",
  },
  mainBtn: {
    backgroundColor: colors.primary,
    borderRadius: AppRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: AppSpacing.md,
    ...AppShadow.cyan,
  },
  mainBtnText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  toggleBtn: { marginTop: 25, alignSelf: "center", padding: AppSpacing.md },
  toggleText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
}

export const loginStyles = makeLoginStyles;
