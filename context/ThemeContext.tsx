import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppColorsDark, AppColorsLight, AppColorTokens } from "@/constants/theme";

export type ColorScheme = "dark" | "light";

interface ThemeContextValue {
  colors: AppColorTokens;
  scheme: ColorScheme;
  /** null = follow system */
  setScheme: (scheme: ColorScheme | null) => Promise<void>;
  isSystemControlled: boolean;
}

const STORAGE_KEY = "appColorScheme";

const ThemeContext = createContext<ThemeContextValue>({
  colors: AppColorsDark,
  scheme: "dark",
  setScheme: async () => {},
  isSystemControlled: true,
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? "dark";
  const [userScheme, setUserScheme] = useState<ColorScheme | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light") {
        setUserScheme(stored);
      }
    });
  }, []);

  const setScheme = useCallback(async (scheme: ColorScheme | null) => {
    setUserScheme(scheme);
    if (scheme === null) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, scheme);
    }
  }, []);

  const activeScheme: ColorScheme = userScheme ?? systemScheme;
  const colors = activeScheme === "dark" ? AppColorsDark : AppColorsLight;

  return (
    <ThemeContext.Provider
      value={{
        colors,
        scheme: activeScheme,
        setScheme,
        isSystemControlled: userScheme === null,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
