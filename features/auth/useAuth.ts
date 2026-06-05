import { useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { authService } from "./authService";
import { ApiError } from "@/lib/http";
import { UserStorage } from "@/lib/storage";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function handleLogin(email: string, password: string) {
    if (!email || !password) {
      Alert.alert(t("login.warning"), t("login.fill_fields"));
      return;
    }
    setLoading(true);
    try {
      await authService.login(email, password);
      router.replace("/(tabs)");
    } catch (e) {
      if (e instanceof ApiError) {
        Alert.alert(t("login.access_denied"), e.detail || t("login.invalid_credentials"));
      } else {
        Alert.alert(t("login.connection_error"), t("login.connection_failed"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await UserStorage.clear();
    router.replace("/screens/login");
  }

  return { handleLogin, handleLogout, loading };
}
