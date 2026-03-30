import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribePush } from '../../src/api/users';

const PUSH_PROMPT_KEY = 'hasSeenPushPrompt';

export async function hasSeenPushPrompt(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_PROMPT_KEY)) === 'true';
}

export async function markPushPromptSeen(): Promise<void> {
  await AsyncStorage.setItem(PUSH_PROMPT_KEY, 'true');
}

export default function PushPermissionScreen() {
  const handleAllow = async () => {
    await markPushPromptSeen();

    if (!Device.isDevice) {
      router.back();
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        await subscribePush(tokenData.data);
      } catch {
        // non-critical
      }
    }
    router.back();
  };

  const handleSkip = async () => {
    await markPushPromptSeen();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>
          {'새로운 기술 콘텐츠가\n올라오면 알려드릴까요?'}
        </Text>
        <Text style={styles.subtitle}>
          {'관심 태그의 새 글, 인기 콘텐츠를\n놓치지 마세요.'}
        </Text>

        <View style={styles.features}>
          <Text style={styles.featureItem}>📰  구독 태그 새 글 알림</Text>
          <Text style={styles.featureItem}>🔥  인기 콘텐츠 알림</Text>
          <Text style={styles.featureItem}>⏰  채용공고 마감 리마인드</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.allowButton} onPress={handleAllow} accessibilityRole="button">
          <Text style={styles.allowButtonText}>알림 허용</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} accessibilityRole="button">
          <Text style={styles.skipButtonText}>나중에</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', lineHeight: 32, marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  features: { alignSelf: 'stretch', gap: 12 },
  featureItem: { fontSize: 15, color: '#374151', lineHeight: 22 },
  actions: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  allowButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  allowButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipButtonText: { color: '#9CA3AF', fontSize: 15 },
});
