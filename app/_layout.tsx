import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../services/i18n';

import { AppThemeProvider, useAppTheme } from '@/context/ThemeContext';
import GlobalVLibras from '@/components/GlobalVLibras';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutInner() {
  const { scheme } = useAppTheme();
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
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        <Stack.Screen name="screens/admin-config" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <GlobalVLibras />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}
