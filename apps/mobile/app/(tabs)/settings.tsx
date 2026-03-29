import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthBenefitsSheet } from '../../src/components/AuthBenefitsSheet';
import { useAuthStore } from '../../src/store/auth.store';
import { useThemeStore } from '../../src/store/theme.store';
import {
  getProfile,
  updateTags,
  updateName,
  subscribePush,
  removePushToken,
  getUserStats,
  getUserPreferences,
  updateUserPreferences,
} from '../../src/api/users';
import { COMMON_TAGS, tagsToCategories, expandTagsForSave } from '../../src/constants/tags';
import { submitReview } from '../../src/api/reviews';
import { trackEvent } from '../../src/api/analytics';

async function getAndRegisterPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const { token, user, logout, pushEnabled, setPushEnabled } = useAuthStore();
  const { theme, setTheme, colors } = useThemeStore();
  const queryClient = useQueryClient();
  const [benefitsVisible, setBenefitsVisible] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!token,
  });

  const { data: stats } = useQuery({
    queryKey: ['userStats'],
    queryFn: getUserStats,
    enabled: !!token,
  });

  const { data: preferences } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: getUserPreferences,
    enabled: !!token,
  });

  // category values (e.g. 'frontend', 'backend') — converted to tech tags on save
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const channelsRef = useRef<string[]>([]);
  const channelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelsInitialized = useRef(false);

  // nickname state
  const [nameInput, setNameInput] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (profile?.tags) {
      setSelectedCategories(tagsToCategories(profile.tags));
    }
  }, [profile?.tags]);

  useEffect(() => {
    if (profile?.name) {
      setNameInput(profile.name);
    }
  }, [profile?.name]);

  useEffect(() => {
    if (preferences?.channels) {
      setChannels(preferences.channels);
      channelsRef.current = preferences.channels;
      channelsInitialized.current = true;
    }
  }, [preferences?.channels]);

  // BUG-002 fix: debounce runs in effect, not inside setState updater
  // skip initial empty state to avoid wiping channels on slow network
  useEffect(() => {
    if (!channelsInitialized.current) return;
    channelsRef.current = channels;
    if (channelDebounceRef.current) clearTimeout(channelDebounceRef.current);
    channelDebounceRef.current = setTimeout(() => {
      updateUserPreferences({ channels: channelsRef.current }).catch(() => {});
    }, 500);
  }, [channels]);

  const handleChannelToggle = useCallback((channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }, []);

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

  const handleSaveTags = () => {
    saveTags(expandTagsForSave(selectedCategories));
  };

  const toggleCategory = useCallback((value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }, []);

  const { mutate: saveNameMutation, isPending: isSavingName } = useMutation({
    mutationFn: () => updateName(nameInput.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    },
    onError: () => {
      Alert.alert('오류', '이름 변경에 실패했습니다.');
    },
  });

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { Alert.alert('오류', '이름을 입력해주세요.'); return; }
    saveNameMutation();
  };

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSent, setReviewSent] = useState(false);

  const { mutate: sendReview, isPending: isReviewPending } = useMutation({
    mutationFn: () => submitReview(reviewRating, reviewBody.trim() || undefined),
    onSuccess: () => {
      setReviewSent(true);
      setReviewRating(0);
      setReviewBody('');
    },
    onError: () => Alert.alert('오류', '리뷰 제출에 실패했습니다.'),
  });

  const handleSendReview = () => {
    if (reviewRating === 0) { Alert.alert('별점을 선택해주세요.'); return; }
    sendReview();
  };

  const handleTogglePush = async (enabled: boolean) => {
    try {
      if (!enabled) {
        await removePushToken();
        trackEvent([{ event_type: 'push_disable' }]);
      } else {
        const pushToken = await getAndRegisterPushToken();
        if (pushToken) {
          await subscribePush(pushToken);
          trackEvent([{ event_type: 'push_enable' }]);
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

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
    content: { padding: 16 },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    sectionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    profileCard: { marginBottom: 16 },
    profileName: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    profileEmail: { fontSize: 14, color: colors.textSecondary },
    settingRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 4,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    settingDescription: { fontSize: 12, color: colors.textSecondary },
    // theme segmented control
    themeRow: {
      flexDirection: 'row' as const,
      gap: 8,
      marginTop: 4,
    },
    themeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.searchBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeBtnText: { fontSize: 14, fontWeight: '500' as const, color: colors.textSecondary },
    themeBtnTextActive: { color: '#FFFFFF', fontWeight: '600' as const },
    nameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginTop: 8,
    },
    nameInput: {
      flex: 1,
      backgroundColor: colors.searchBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nameSaveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    nameSaveBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
    nameSavedText: { fontSize: 13, color: colors.primary, marginTop: 4 },
    predefinedTagList: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginBottom: 4,
    },
    predefinedChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.searchBg,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      marginBottom: 8,
    },
    predefinedChipActive: {
      backgroundColor: colors.primaryDim,
      borderColor: colors.primary,
    },
    predefinedChipText: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary },
    predefinedChipTextActive: { color: colors.primary, fontWeight: '600' as const },
    center: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 24,
    },
    message: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      marginBottom: 24,
      lineHeight: 22,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: 'center' as const,
      width: '100%' as const,
      marginBottom: 10,
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
    secondaryButton: {
      paddingHorizontal: 24,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: 'center' as const,
      width: '100%' as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' as const },
    dangerButton: {
      borderWidth: 1,
      borderColor: '#FCA5A5',
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    dangerButtonText: { fontSize: 15, color: '#EF4444', fontWeight: '500' as const },
    buttonDisabled: { opacity: 0.6 },
    // stats card
    statsCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 16,
      marginBottom: 12,
    },
    statItem: {
      flex: 1,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    topTagsLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    progressRow: {
      marginBottom: 6,
    },
    progressLabel: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 3,
    },
    progressTagText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '500' as const,
    },
    progressPct: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    progressTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: 4,
      borderRadius: 2,
    },
    sourcesNavBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
    },
    sourcesNavText: { fontSize: 15, fontWeight: '500' as const, color: colors.textPrimary },
    sourcesNavArrow: { fontSize: 18, color: colors.textSecondary },
    starRow: { flexDirection: 'row' as const, gap: 8, marginVertical: 12 },
    reviewInput: {
      backgroundColor: colors.searchBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 80,
      textAlignVertical: 'top' as const,
      marginBottom: 12,
    },
    reviewSentText: { fontSize: 13, color: colors.primary, textAlign: 'center' as const, marginBottom: 8 },
  }), [colors]);

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
            onPress={() => setBenefitsVisible(true)}
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
        <AuthBenefitsSheet
          visible={benefitsVisible}
          onClose={() => setBenefitsVisible(false)}
          onSignIn={() => {
            setBenefitsVisible(false);
            router.push('/auth/login');
          }}
        />
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
          <Text style={styles.settingTitle}>닉네임 변경</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="표시 이름 입력"
              placeholderTextColor={colors.textSecondary}
              maxLength={30}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.nameSaveBtn, isSavingName && styles.buttonDisabled]}
              onPress={handleSaveName}
              disabled={isSavingName}
              accessibilityRole="button"
            >
              {isSavingName
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.nameSaveBtnText}>저장</Text>
              }
            </TouchableOpacity>
          </View>
          {nameSaved && <Text style={styles.nameSavedText}>닉네임이 변경되었습니다.</Text>}
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleLogout}
              accessibilityRole="button"
            >
              <Text style={styles.dangerButtonText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 독서 통계 */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionLabel}>독서 통계</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.week_reads}</Text>
                <Text style={styles.statLabel}>이번 주 읽음</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>🔥 {stats.streak_days}일</Text>
                <Text style={styles.statLabel}>연속 읽기</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_reads}</Text>
                <Text style={styles.statLabel}>전체 읽음</Text>
              </View>
            </View>
            {stats.tag_distribution.length > 0 && (
              <>
                <Text style={styles.topTagsLabel}>
                  가장 많이 읽은 태그:{' '}
                  {stats.tag_distribution
                    .slice(0, 2)
                    .map((t) => t.tag)
                    .join(', ')}
                </Text>
                {stats.tag_distribution.slice(0, 4).map((t, i) => {
                  const opacityLevels = [1, 0.75, 0.5, 0.35];
                  const opacity = opacityLevels[i] ?? 0.35;
                  return (
                    <View key={t.tag} style={styles.progressRow}>
                      <View style={styles.progressLabel}>
                        <Text style={styles.progressTagText}>{t.tag}</Text>
                        <Text style={styles.progressPct}>{t.percentage}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${t.percentage}%`,
                              backgroundColor: colors.primary,
                              opacity,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* 화면 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>화면 설정</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>테마</Text>
              <Text style={styles.settingDescription}>앱 색상 테마를 선택하세요</Text>
            </View>
          </View>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActive]}
              onPress={() => setTheme('dark')}
              accessibilityRole="button"
              accessibilityLabel="다크 테마"
              accessibilityState={{ selected: theme === 'dark' }}
            >
              <Text style={[styles.themeBtnText, theme === 'dark' && styles.themeBtnTextActive]}>
                🌙 다크
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]}
              onPress={() => setTheme('light')}
              accessibilityRole="button"
              accessibilityLabel="라이트 테마"
              accessibilityState={{ selected: theme === 'light' }}
            >
              <Text style={[styles.themeBtnText, theme === 'light' && styles.themeBtnTextActive]}>
                ☀️ 라이트
              </Text>
            </TouchableOpacity>
          </View>
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
              trackColor={{ false: colors.border, true: '#93C5FD' }}
              thumbColor={pushEnabled ? colors.primary : colors.searchBg}
            />
          </View>
        </View>

        {/* 구독 소스 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>구독 소스</Text>
          <Text style={styles.sectionDescription}>
            특정 블로그, YouTube 채널, 채용 사이트를 팔로우하면 해당 소스의 콘텐츠를 우선 확인할 수 있습니다.
          </Text>
          <TouchableOpacity
            style={styles.sourcesNavBtn}
            onPress={() => router.push('/settings/sources')}
            accessibilityRole="button"
          >
            <Text style={styles.sourcesNavText}>소스 팔로우 관리</Text>
            <Text style={styles.sourcesNavArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 구독 태그 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>구독 태그</Text>
          <Text style={styles.sectionDescription}>
            관심 카테고리를 선택하면 블로그·YouTube·채용공고 전체에서 맞춤 피드와 푸시 알림을 받을 수 있습니다.
          </Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View style={styles.predefinedTagList}>
                {COMMON_TAGS.map((tag) => {
                  const active = selectedCategories.includes(tag.value);
                  return (
                    <TouchableOpacity
                      key={tag.value}
                      style={[styles.predefinedChip, active && styles.predefinedChipActive]}
                      onPress={() => toggleCategory(tag.value)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={tag.label}
                      accessibilityState={{ checked: active }}
                    >
                      <Text style={[styles.predefinedChipText, active && styles.predefinedChipTextActive]}>
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
        {/* 앱 리뷰 */}
        {token && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>앱 리뷰</Text>
            <Text style={styles.sectionDescription}>
              TechFeed를 사용해보셨나요? 솔직한 의견을 남겨주세요.
            </Text>
            {reviewSent ? (
              <Text style={styles.reviewSentText}>리뷰를 남겨주셔서 감사합니다!</Text>
            ) : (
              <>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)} accessibilityRole="button" accessibilityLabel={`${star}점`}>
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= reviewRating ? '#F59E0B' : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  value={reviewBody}
                  onChangeText={setReviewBody}
                  placeholder="의견을 자유롭게 남겨주세요 (선택)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, isReviewPending && styles.buttonDisabled]}
                  onPress={handleSendReview}
                  disabled={isReviewPending}
                  accessibilityRole="button"
                >
                  {isReviewPending
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.primaryButtonText}>리뷰 제출</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
