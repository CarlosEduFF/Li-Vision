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
        <Stack.Screen name="screens/cam/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/collect-static/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/collect-dynamic/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/train/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/models/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/login/index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="screens/register/index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="screens/manage-datasets/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/edit-profile/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/select-model/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/gesture-detail/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/manage-learning/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/ranking/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/about/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/levels-info/index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/admin-config/index" options={{ headerShown: false }} />
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
