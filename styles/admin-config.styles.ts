import { StyleSheet } from "react-native";
import { AppColorTokens, AppRadius, AppSpacing } from "@/constants/theme";

export function makeAdminConfigStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  scrollContent: { padding: AppSpacing.xl, paddingTop: 60 },
  header: { marginBottom: 30 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
    marginBottom: AppSpacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4a5568",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 15,
    marginLeft: 5,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: AppSpacing.xl,
    borderRadius: AppRadius.xxl,
    borderWidth: 1,
    borderColor: "#2a3548",
    marginBottom: 12,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: AppRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: AppSpacing.xl,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 4,
  },
  cardDesc: { fontSize: 12, color: "#697688" },
  toggleOuter: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2a3548",
    padding: 2,
    justifyContent: "center",
  },
  toggleOuterActive: { backgroundColor: "#ff6b6b" },
  toggleInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text.primary,
  },
  toggleInnerActive: { transform: [{ translateX: 20 }] },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(76, 175, 80, 0.05)",
    padding: 15,
    borderRadius: AppRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.1)",
    marginTop: 10,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: "#81c784", lineHeight: 18 },
  footer: { marginTop: AppSpacing.xl, alignItems: "center", paddingBottom: 40 },
  footerText: { fontSize: 12, color: "#2d3748" },
});
}

export const adminConfigStyles = makeAdminConfigStyles;
