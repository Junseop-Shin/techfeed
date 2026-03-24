import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '피드',
          tabBarLabel: '피드',
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarLabel: '검색',
          tabBarIcon: ({ color }) => (
            <TabIcon name="search" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: '북마크',
          tabBarLabel: '북마크',
          tabBarIcon: ({ color }) => (
            <TabIcon name="bookmark" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarLabel: '설정',
          tabBarIcon: ({ color }) => (
            <TabIcon name="settings" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Minimal icon component using text symbols (no icon library dependency)
function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    home: '⌂',
    search: '⌕',
    bookmark: '⊡',
    settings: '⚙',
  };
  const { Text } = require('react-native');
  return (
    <Text style={{ fontSize: 20, color, lineHeight: 24 }}>
      {icons[name] ?? '●'}
    </Text>
  );
}
