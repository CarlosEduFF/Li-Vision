import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../services/i18n';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const API_URL = "https://li-visionv2.onrender.com";
const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await originalFetch(input, init);
  
  if (response.status === 401) {
    const url = typeof input === "string" ? input : (input as any).url || "";
    // Evita loop se o erro for na própria rota de refresh
    if (url.includes("/auth/refresh")) {
      return response;
    }

    console.log("401 Unauthorized detectado. Tentando renovar token...");
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    
    if (refreshToken) {
      try {
        const refreshResponse = await originalFetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        const refreshData = await refreshResponse.json();
        
        if (refreshResponse.ok && refreshData.token) {
          console.log("Token renovado com sucesso! Retentando requisição...");
          await AsyncStorage.setItem("userToken", refreshData.token);
          if (refreshData.refresh_token) {
             await AsyncStorage.setItem("refreshToken", refreshData.refresh_token);
          }
          
          // Prepara a nova tentativa com o novo token
          const newInit = { ...init };
          const newHeaders = new Headers(newInit.headers || {});
          newHeaders.set("Authorization", `Bearer ${refreshData.token}`);
          newInit.headers = newHeaders;
          
          return await originalFetch(input, newInit);
        }
      } catch (e) {
        console.log("Erro ao tentar renovar token:", e);
      }
    }

    console.log("Sessão expirada e não pôde ser renovada. Deslogando...");
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("refreshToken");
    
    try {
      const { router } = require("expo-router");
      router.replace("/screens/login");
    } catch (e) {
      console.log("Erro ao redirecionar para login:", e);
    }
  }
  return response;
};

import GlobalVLibras from '@/components/GlobalVLibras';

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
        <Stack.Screen name="screens/manage-learning" options={{ headerShown: false }} />
        <Stack.Screen name="screens/ranking" options={{ headerShown: false }} />
        <Stack.Screen name="screens/about" options={{ headerShown: false }} />
        <Stack.Screen name="screens/levels-info" options={{ headerShown: false }} />
        <Stack.Screen name="screens/admin-config" options={{headerShown: false}}/>
      </Stack>
      <StatusBar style="auto" />
      <GlobalVLibras />
    </ThemeProvider>
  );
}
