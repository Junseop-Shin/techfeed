import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeStore } from '../../src/store/theme.store';
import { useAuthStore } from '../../src/store/auth.store';
import { useContents, useRecommended } from '../../src/hooks/useContents';
import { useBookmarksByType } from '../../src/hooks/useBookmark';
import { AuthBenefitsSheet } from '../../src/components/AuthBenefitsSheet';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

interface StatCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  itemCount: number;
  bookmarkCount: number;
  onPress: () => void;
}

function StatCard({ icon, label, itemCount, bookmarkCount, onPress }: StatCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => StyleSheet.create({
    statCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    statCardLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    statIcon: {},
    statLabel: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.textPrimary,
    },
    statCardRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    statBadge: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statBadgeBookmark: {
      backgroundColor: colors.primaryDim,
    },
    statBadgeText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    statBadgeBookmarkText: {
      color: colors.bookmark,
    },
    statArrow: {
      fontSize: 18,
      color: colors.textTertiary,
      marginLeft: 4,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} 탭으로 이동`}
    >
      <View style={styles.statCardLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <View style={styles.statCardRight}>
        <View style={styles.statBadge}>
          <Text style={styles.statBadgeText}>글 {itemCount}개</Text>
        </View>
        <View style={[styles.statBadge, styles.statBadgeBookmark]}>
          <Text style={[styles.statBadgeText, styles.statBadgeBookmarkText]}>
            ★ {bookmarkCount}
          </Text>
        </View>
        <Text style={styles.statArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function BlogStats() {
  const { data } = useContents({ source_type: 'blog', limit: 1 });
  const { data: bookmarks } = useBookmarksByType('blog');
  const itemCount = data?.total ?? 0;
  const bookmarkCount = bookmarks?.length ?? 0;
  return (
    <StatCard
      icon="document-text-outline"
      label="블로그"
      itemCount={itemCount}
      bookmarkCount={bookmarkCount}
      onPress={() => router.push('/(tabs)/blog')}
    />
  );
}

function YoutubeStats() {
  const { data } = useContents({ source_type: 'youtube', limit: 1 });
  const { data: bookmarks } = useBookmarksByType('youtube');
  const itemCount = data?.total ?? 0;
  const bookmarkCount = bookmarks?.length ?? 0;
  return (
    <StatCard
      icon="logo-youtube"
      label="YouTube"
      itemCount={itemCount}
      bookmarkCount={bookmarkCount}
      onPress={() => router.push('/(tabs)/youtube')}
    />
  );
}

function JobStats() {
  const { data } = useContents({ source_type: 'job', limit: 1 });
  const { data: bookmarks } = useBookmarksByType('job');
  const itemCount = data?.total ?? 0;
  const bookmarkCount = bookmarks?.length ?? 0;
  return (
    <StatCard
      icon="briefcase-outline"
      label="채용공고"
      itemCount={itemCount}
      bookmarkCount={bookmarkCount}
      onPress={() => router.push('/(tabs)/jobs')}
    />
  );
}

function RecommendedSection({ onShowBenefits }: { onShowBenefits: () => void }) {
  const colors = useThemeStore((s) => s.colors);
  const token = useAuthStore((s) => s.token);
  const { data, isLoading } = useRecommended();
  const items = data?.items?.slice(0, 5) ?? [];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionHeader: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          marginBottom: 12,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: '700' as const,
          color: colors.textPrimary,
        },
        scrollRow: {
          paddingLeft: 16,
        },
        card: {
          width: 180,
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          marginRight: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        cardSource: {
          fontSize: 11,
          color: colors.textSecondary,
          fontWeight: '500' as const,
          marginBottom: 6,
        },
        cardTitle: {
          fontSize: 13,
          fontWeight: '600' as const,
          color: colors.textPrimary,
          lineHeight: 18,
          marginBottom: 8,
          flex: 1,
        },
        cardDate: {
          fontSize: 11,
          color: colors.textTertiary,
        },
        skeletonCard: {
          width: 180,
          backgroundColor: colors.surfaceHigh,
          borderRadius: 12,
          padding: 14,
          marginRight: 10,
          height: 100,
        },
        skeletonLine: {
          height: 10,
          backgroundColor: colors.border,
          borderRadius: 4,
          marginBottom: 8,
        },
        banner: {
          backgroundColor: colors.primaryDim,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
        },
        bannerText: {
          fontSize: 14,
          fontWeight: '600' as const,
          color: colors.primary,
        },
        bannerArrow: {
          fontSize: 14,
          color: colors.primary,
        },
      }),
    [colors]
  );

  if (!token) {
    return (
      <TouchableOpacity
        style={styles.banner}
        onPress={onShowBenefits}
        accessibilityRole="button"
        accessibilityLabel="맞춤 추천 받기"
      >
        <Text style={styles.bannerText}>맞춤 추천 받기</Text>
        <Text style={styles.bannerArrow}>→</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>맞춤 추천</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {isLoading
          ? [0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={[styles.skeletonLine, { width: '50%' }]} />
                <View style={[styles.skeletonLine, { width: '90%' }]} />
                <View style={[styles.skeletonLine, { width: '70%' }]} />
              </View>
            ))
          : items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/content/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <Text style={styles.cardSource} numberOfLines={1}>
                  {item.source_name}
                </Text>
                <Text style={styles.cardTitle} numberOfLines={3}>
                  {item.title}
                </Text>
                <Text style={styles.cardDate}>
                  {new Date(item.published_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            ))}
      </ScrollView>
    </>
  );
}

function RecentFeed() {
  const colors = useThemeStore((s) => s.colors);
  const { data, isLoading } = useContents({ limit: 5 });
  const items = data?.items ?? [];

  const styles = useMemo(() => StyleSheet.create({
    loadingRow: { paddingVertical: 20, alignItems: 'center' as const },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' as const, paddingVertical: 20 },
    recentItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    recentSource: { fontSize: 11, color: colors.textSecondary, marginBottom: 3, fontWeight: '500' as const },
    recentTitle: { fontSize: 14, fontWeight: '500' as const, color: colors.textPrimary, marginBottom: 4 },
    recentDate: { fontSize: 11, color: colors.textTertiary },
  }), [colors]);

  if (isLoading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return <Text style={styles.emptyText}>최신 콘텐츠가 없습니다.</Text>;
  }

  return (
    <>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.recentItem}
          onPress={() => router.push(`/content/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <Text style={styles.recentSource}>{item.source_name}</Text>
          <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.recentDate}>{formatDate(item.published_at)}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

export default function HomeScreen() {
  const colors = useThemeStore((s) => s.colors);
  const { token, user } = useAuthStore();
  const userName = user?.name ?? user?.email ?? null;
  const [benefitsVisible, setBenefitsVisible] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.surfaceHigh,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 22, fontWeight: '700' as const, color: colors.textPrimary, letterSpacing: -0.5 },
    notifBtn: { padding: 4 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 32 },
    greetingCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      padding: 20,
    },
    greetingEmoji: { fontSize: 28, marginBottom: 8 },
    greetingText: { fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary, marginBottom: 4 },
    greetingName: { color: colors.primary },
    greetingSubText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    loginButton: {
      marginTop: 16,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    loginButtonText: { fontSize: 15, fontWeight: '600' as const, color: colors.textPrimary },
    section: { marginTop: 24, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.textPrimary, marginBottom: 12 },
    recentCard: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' as const },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TechFeed</Text>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push('/(tabs)/settings')}
          accessibilityRole="button"
          accessibilityLabel="설정"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 인사말 카드 */}
        <View style={styles.greetingCard}>
          {token && userName ? (
            <>
              <Text style={styles.greetingEmoji}>👋</Text>
              <Text style={styles.greetingText}>
                안녕하세요, <Text style={styles.greetingName}>{userName}</Text>님!
              </Text>
              <Text style={styles.greetingSubText}>오늘도 새로운 기술 트렌드를 확인해보세요.</Text>
            </>
          ) : (
            <>
              <Text style={styles.greetingEmoji}>👋</Text>
              <Text style={styles.greetingText}>안녕하세요!</Text>
              <Text style={styles.greetingSubText}>로그인하면 북마크와 맞춤 피드를 이용할 수 있어요.</Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth/login')}
                accessibilityRole="button"
              >
                <Text style={styles.loginButtonText}>로그인하기</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 맞춤 추천 섹션 */}
        <View style={styles.section}>
          <RecommendedSection onShowBenefits={() => setBenefitsVisible(true)} />
        </View>

        {/* 오늘의 피드 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 피드</Text>
          <BlogStats />
          <YoutubeStats />
          <JobStats />
        </View>

        {/* 최신 업데이트 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최신 업데이트</Text>
          <View style={styles.recentCard}>
            <RecentFeed />
          </View>
        </View>
      </ScrollView>

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
