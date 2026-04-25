import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await originalFetch(input, init);
  if (response.status === 401) {
    console.log("401 Unauthorized detectado. Sessão expirada. Deslogando...");
    await AsyncStorage.removeItem("userToken");
    
    // Fallback para tentar usar o router global ou aguardar a montagem
    try {
      const { router } = require("expo-router");
      router.replace("/screens/login");
    } catch (e) {
      console.log("Erro ao redirecionar para login:", e);
    }
  }
  return response;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setTimeout(() => router.replace("/screens/login"), 100);
      }
    };
    checkAuth();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="screens/cam" options={{ headerShown: false }} />
        <Stack.Screen name="screens/collect-static" options={{ headerShown: false }} />
        <Stack.Screen name="screens/collect-dynamic" options={{ headerShown: false }} />
        <Stack.Screen name="screens/train" options={{ headerShown: false }} />
        <Stack.Screen name="screens/models" options={{ headerShown: false }} />
        <Stack.Screen name="screens/login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="screens/register" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="screens/manage-datasets" options={{ headerShown: false }} />
        <Stack.Screen name="screens/edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="screens/select-model" options={{ headerShown: false }} />
        <Stack.Screen name="screens/gesture-detail" options={{ headerShown: false }} />
        <Stack.Screen name="screens/models" options={{ headerShown: false }} />
        <Stack.Screen name="screens/manage-learning" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
