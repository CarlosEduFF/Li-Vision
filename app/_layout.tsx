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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="screens/login/index" options={{ animation: 'fade' }} />
        <Stack.Screen name="screens/register/index" options={{ animation: 'fade' }} />
        <Stack.Screen name="screens/cam/index" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="screens/select-model/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="screens/ranking/index" options={{ animation: 'slide_from_right' }} />
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
