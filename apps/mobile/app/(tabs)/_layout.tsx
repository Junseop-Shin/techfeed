import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useThemeStore } from '../../src/store/theme.store';

export default function TabsLayout() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: '블로그',
          tabBarLabel: '블로그',
          tabBarIcon: ({ color }) => (
            <TabIcon name="blog" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="youtube"
        options={{
          title: 'YouTube',
          tabBarLabel: 'YouTube',
          tabBarIcon: ({ color }) => (
            <TabIcon name="youtube" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: '채용공고',
          tabBarLabel: '채용공고',
          tabBarIcon: ({ color }) => (
            <TabIcon name="jobs" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '전체',
          tabBarLabel: '전체',
          tabBarIcon: ({ color }) => (
            <TabIcon name="settings" color={color} />
          ),
        }}
      />
      {/* Hidden tabs — kept for redirect compatibility */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="bookmarks" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    home: '⌂',
    blog: '✏',
    youtube: '▶',
    jobs: '💼',
    settings: '☰',
  };
  return (
    <Text style={{ fontSize: 20, color, lineHeight: 24 }}>
      {icons[name] ?? '●'}
    </Text>
  );
}
