import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TagChip } from '../../src/components/TagChip';
import { useAuthStore } from '../../src/store/auth.store';
import { getProfile, updateTags, subscribePush, removePushToken } from '../../src/api/users';

async function getAndRegisterPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

export default function SettingsScreen() {
  const { token, user, logout, pushEnabled, setPushEnabled } = useAuthStore();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!token,
  });

  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.tags) {
      setTags(profile.tags);
    }
  }, [profile?.tags]);

  const { mutate: saveTags, isPending: isSaving } = useMutation({
    mutationFn: updateTags,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert('저장됨', '태그가 업데이트되었습니다.');
    },
    onError: () => {
      Alert.alert('오류', '태그 저장에 실패했습니다.');
    },
  });

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSaveTags = () => {
    saveTags(tags);
  };

  const handleTogglePush = async (enabled: boolean) => {
    try {
      if (!enabled) {
        await removePushToken();
      } else {
        const pushToken = await getAndRegisterPushToken();
        if (pushToken) {
          await subscribePush(pushToken);
        } else {
          Alert.alert('알림 권한', '설정 앱에서 알림 권한을 허용해주세요.');
          return;
        }
      }
      await setPushEnabled(enabled);
    } catch {
      Alert.alert('오류', '알림 설정 변경에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
          queryClient.clear();
        },
      },
    ]);
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.message}>로그인하면 더 많은 기능을 사용할 수 있습니다.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/login')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/signup')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* 계정 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>계정</Text>
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{user?.name || profile?.name || '이름 없음'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? profile?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleLogout}
            accessibilityRole="button"
          >
            <Text style={styles.dangerButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>알림 설정</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>푸시 알림</Text>
              <Text style={styles.settingDescription}>새 콘텐츠 알림을 받습니다</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={pushEnabled ? '#2563EB' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* 구독 태그 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>구독 태그</Text>
          <Text style={styles.sectionDescription}>
            관심 있는 기술 태그를 등록하면 맞춤 피드를 받을 수 있습니다.
          </Text>
          {isLoading ? (
            <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View style={styles.tagList}>
                {tags.map((tag) => (
                  <TagChip
                    key={tag}
                    label={tag}
                    selected={true}
                    onPress={() => handleRemoveTag(tag)}
                  />
                ))}
              </View>
              <View style={styles.addTagRow}>
                <TextInput
                  style={styles.tagInput}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="태그 추가..."
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                  accessibilityLabel="태그 입력"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddTag}
                  accessibilityRole="button"
                  accessibilityLabel="태그 추가"
                >
                  <Text style={styles.addButtonText}>추가</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleSaveTags}
                disabled={isSaving}
                accessibilityRole="button"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>태그 저장</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
