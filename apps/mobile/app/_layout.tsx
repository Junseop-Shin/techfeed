import React, { useEffect } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuthStore } from '../src/store/auth.store';
import { useSeenStore } from '../src/store/seen.store';
import { subscribePush, resetBadge } from '../src/api/users';
import { trackEvent } from '../src/api/analytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    // Use native device token (FCM for Android, APNS for iOS) for Firebase Admin SDK
    const tokenData = await Notifications.getDevicePushTokenAsync();
    await subscribePush(tokenData.data);
  } catch {
    // Push subscription failure is non-critical
  }
}

function RootLayout() {
  const restoreToken = useAuthStore((s) => s.restoreToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pushEnabled = useAuthStore((s) => s.pushEnabled);
  const loadVisits = useSeenStore((s) => s.loadVisits);

  useEffect(() => {
    restoreToken();
    loadVisits();
  }, [restoreToken, loadVisits]);

  useEffect(() => {
    if (!isLoading && pushEnabled) {
      registerForPushNotifications();
    }
  }, [isLoading, pushEnabled]);

  useEffect(() => {
    // Fire once on app start — after auth is restored
    if (!isLoading) {
      trackEvent([{ event_type: 'app_open' }]);
    }
  }, [isLoading]);

  useEffect(() => {
    // Clear badge when user taps a notification to open the app
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      Notifications.setBadgeCountAsync(0).catch(() => {});
      resetBadge().catch(() => {});
    });

    // Clear badge when app comes to foreground (user opened app directly)
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        Notifications.setBadgeCountAsync(0).catch(() => {});
        resetBadge().catch(() => {});
      }
    });

    return () => {
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/signup" options={{ presentation: 'modal' }} />
      <Stack.Screen name="content/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="settings/sources" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayout />
    </QueryClientProvider>
  );
}
