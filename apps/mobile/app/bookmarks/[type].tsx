import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ContentCard } from '../../src/components/ContentCard';
import { useAuthStore } from '../../src/store/auth.store';
import { useThemeStore } from '../../src/store/theme.store';
import { useBookmarksByType, useUpdateBookmarkStatus } from '../../src/hooks/useBookmark';
import type { BookmarkItem } from '../../src/api/users';

type ContentWithDeadline = { deadline?: string } & Record<string, unknown>;

function getDDayLabel(deadline: string): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  const diff = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: '마감', color: '#9CA3AF' };
  if (diff === 0) return { label: 'D-Day', color: '#EF4444' };
  if (diff <= 3) return { label: `D-${diff}`, color: '#EF4444' };
  if (diff <= 7) return { label: `D-${diff}`, color: '#F97316' };
  return { label: `D-${diff}`, color: '#6B7280' };
}

function DDayBadge({ deadline }: { deadline: string }) {
  const { label, color } = getDDayLabel(deadline);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          borderRadius: 4,
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderWidth: 1,
          borderColor: color,
          alignSelf: 'flex-start' as const,
        },
        text: {
          fontSize: 11,
          fontWeight: '700' as const,
          color,
        },
      }),
    [color]
  );

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

type ContentTypeParam = 'blog' | 'youtube' | 'jobs';

const CONTENT_TYPE_MAP: Record<ContentTypeParam, string> = {
  blog: 'blog',
  youtube: 'youtube',
  jobs: 'job',
};

const HEADER_TITLE_MAP: Record<ContentTypeParam, string> = {
  blog: '블로그 북마크',
  youtube: 'YouTube 북마크',
  jobs: '채용공고 북마크',
};

interface StatusTab {
  value: string;
  label: string;
}

const CONTENT_STATUS_TABS: StatusTab[] = [
  { value: 'interested', label: '관심' },
  { value: 'done', label: '완독' },
  { value: 'shared', label: '공유함' },
];

const JOB_STATUS_TABS: StatusTab[] = [
  { value: 'interested', label: '관심' },
  { value: 'to_apply', label: '지원예정' },
  { value: 'applied', label: '지원완료' },
  { value: 'interviewing', label: '면접중' },
  { value: 'accepted', label: '최종합격' },
  { value: 'rejected', label: '탈락' },
];

function isValidType(type: string): type is ContentTypeParam {
  return type === 'blog' || type === 'youtube' || type === 'jobs';
}

interface BookmarkItemRowProps {
  item: BookmarkItem;
  statusTabs: StatusTab[];
  onStatusChange: (contentId: string, status: string) => void;
  colors: ReturnType<typeof useThemeStore>['colors'] extends infer C ? C : never;
}

function BookmarkItemRow({ item, statusTabs, onStatusChange, colors }: BookmarkItemRowProps) {
  const styles = useMemo(() => StyleSheet.create({
    statusBadgeWrapper: {
      position: 'absolute' as const,
      top: 14,
      right: 28,
      flexDirection: 'column' as const,
      alignItems: 'flex-end' as const,
      gap: 4,
    },
    statusBadge: {
      backgroundColor: colors.primaryDim,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    fallbackRow: {
      marginHorizontal: 16,
      marginVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    fallbackId: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  }), [colors]);

  const handleLongPress = () => {
    const options = statusTabs.map((tab) => ({
      text: tab.label,
      onPress: () => onStatusChange(item.content_id, tab.value),
    }));
    Alert.alert(
      '상태 변경',
      '북마크 상태를 선택하세요.',
      [...options, { text: '취소', style: 'cancel' as const }]
    );
  };

  const currentStatus = statusTabs.find((t) => t.value === item.status);
  const deadline = item.content
    ? (item.content as unknown as ContentWithDeadline).deadline
    : undefined;
  const isJobType = item.content_type === 'job';

  return (
    <TouchableOpacity
      style={{ position: 'relative' }}
      onPress={() => router.push(`/content/${item.content_id}`)}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityLabel="북마크 아이템, 탭하면 상세보기, 길게 눌러 상태 변경"
    >
      {item.content ? (
        <ContentCard content={item.content} />
      ) : (
        <View style={styles.fallbackRow}>
          <Text style={styles.fallbackId} numberOfLines={1}>
            {item.content_id}
          </Text>
        </View>
      )}
      <View style={styles.statusBadgeWrapper}>
        {isJobType && deadline && <DDayBadge deadline={deadline} />}
        {currentStatus && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{currentStatus.label}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function BookmarksTypeScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const token = useAuthStore((s) => s.token);
  const colors = useThemeStore((s) => s.colors);

  const validType = isValidType(type ?? '') ? (type as ContentTypeParam) : 'blog';
  const contentType = CONTENT_TYPE_MAP[validType];
  const statusTabs = validType === 'jobs' ? JOB_STATUS_TABS : CONTENT_STATUS_TABS;

  const [selectedStatus, setSelectedStatus] = useState<string>(statusTabs[0].value);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: bookmarks, isLoading, isError, refetch } = useBookmarksByType(contentType);
  const { mutate: updateStatus } = useUpdateBookmarkStatus();

  const filteredBookmarks = bookmarks?.filter((b) => b.status === selectedStatus) ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleStatusChange = useCallback(
    (contentId: string, status: string) => {
      updateStatus(
        { contentId, status },
        {
          onError: () => {
            Alert.alert('오류', '상태 변경에 실패했습니다.');
          },
        }
      );
    },
    [updateStatus]
  );

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.textPrimary,
    },
    backBtn: {
      width: 32,
      alignItems: 'flex-start' as const,
    },
    backBtnText: {
      fontSize: 20,
      color: colors.primary,
      fontWeight: '600' as const,
    },
    statusTabsWrapper: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statusTabsContent: {
      paddingHorizontal: 16,
    },
    statusTab: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginRight: 4,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    statusTabActive: {
      borderBottomColor: colors.primary,
    },
    statusTabText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    statusTabTextActive: {
      color: colors.primary,
    },
    center: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingTop: 80,
    },
    message: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 20,
      textAlign: 'center' as const,
    },
    loginButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600' as const,
    },
    retryButton: {
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryText: {
      fontSize: 14,
      color: colors.primary,
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    list: {
      paddingVertical: 8,
      paddingBottom: 24,
    },
  }), [colors]);

  const renderItem = useCallback(
    ({ item }: { item: BookmarkItem }) => (
      <BookmarkItemRow
        item={item}
        statusTabs={statusTabs}
        onStatusChange={handleStatusChange}
        colors={colors}
      />
    ),
    [statusTabs, handleStatusChange, colors]
  );

  const keyExtractor = useCallback((item: BookmarkItem) => String(item.id), []);

  if (!token) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <Text style={styles.backBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{HEADER_TITLE_MAP[validType]}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <Text style={styles.message}>북마크를 보려면 로그인이 필요합니다.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
            accessibilityRole="button"
          >
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Text style={styles.backBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{HEADER_TITLE_MAP[validType]}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.statusTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusTabsContent}
        >
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.statusTab,
                selectedStatus === tab.value && styles.statusTabActive,
              ]}
              onPress={() => setSelectedStatus(tab.value)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: selectedStatus === tab.value }}
            >
              <Text
                style={[
                  styles.statusTabText,
                  selectedStatus === tab.value && styles.statusTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>북마크를 불러올 수 없습니다.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={filteredBookmarks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>해당 상태의 북마크가 없습니다.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
