import React from 'react';
import { Text } from 'react-native';
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
          title: '설정',
          tabBarLabel: '설정',
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
    blog: '✏',
    youtube: '▶',
    jobs: '💼',
    settings: '⚙',
  };
  return (
    <Text style={{ fontSize: 20, color, lineHeight: 24 }}>
      {icons[name] ?? '●'}
    </Text>
  );
}
