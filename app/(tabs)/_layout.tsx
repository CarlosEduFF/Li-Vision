import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from "react-native";

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00e5ff",
        tabBarInactiveTintColor: "#697688",
        tabBarStyle: {
          backgroundColor: "#10141a",
          borderTopColor: "rgba(255,255,255,0.05)",
          elevation: 0,
        },
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="transcription"
        options={{
          title: 'Traduzir',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="arrow.triangle.2.circlepath" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="learn"
        options={{
          title: 'Aprender',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="studio"
        options={{
          title: 'Studio',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="play.rectangle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
