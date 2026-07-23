import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
          backgroundColor: colors.background,
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
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="transcription/index"
        options={{
          title: t('tabs.translate'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="arrow.triangle.2.circlepath" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="learn/index"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="studio/index"
        options={{
          title: t('tabs.studio'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="play.rectangle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
