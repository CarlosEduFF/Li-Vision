import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { useAppTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border.subtle,
          elevation: 0,
        },
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index/index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="home" color={color} />,
        }}
      />

      <Tabs.Screen
        name="transcription/index"
        options={{
          title: t('tabs.translate'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="autorenew" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="learn/index"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="menu-book" color={color} />,
        }}
      />

      <Tabs.Screen
        name="studio/index"
        options={{
          title: t('tabs.studio'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="smart-display" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
