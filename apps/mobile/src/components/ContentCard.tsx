import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Content } from '../api/contents';
import { getContentSummary, toggleLike } from '../api/contents';
import { useBookmarks } from '../hooks/useBookmark';
import { addBookmarkWithType, removeBookmark } from '../api/users';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { useSeenStore } from '../store/seen.store';
import { trackEvent } from '../api/analytics';

interface ContentCardProps {
  content: Content;
  isNew?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Bookmark button: always saves as 'interested' directly (no dialog)
function BookmarkButton({ contentId, sourceType }: { contentId: string; sourceType: string }) {
  const token = useAuthStore((s) => s.token);
  const colors = useThemeStore((s) => s.colors);
  const { data: bookmarkIds } = useBookmarks();
  const queryClient = useQueryClient();

  const isBookmarked = bookmarkIds?.has(contentId) ?? false;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bookmarks'] });

  const handlePress = () => {
    if (!token) {
      trackEvent([{ event_type: 'login_prompt_seen', metadata: { action: 'bookmark' } }]);
      Alert.alert('로그인 필요', '북마크하려면 로그인이 필요합니다.');
      return;
    }
    if (isBookmarked) {
      removeBookmark(contentId)
        .then(invalidate)
        .catch(() => Alert.alert('오류', '북마크 삭제에 실패했습니다.'));
    } else {
      addBookmarkWithType(contentId, sourceType, 'interested')
        .then(invalidate)
        .catch(() => Alert.alert('오류', '북마크 저장에 실패했습니다.'));
    }
  };

  return (
    <TouchableOpacity
      style={{ padding: 4 }}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? '북마크 제거' : '관심 북마크 추가'}
    >
      <Ionicons
        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
        size={20}
        color={isBookmarked ? colors.bookmark : colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

// Like button (heart) for list cards
function LikeButton({ contentId, likeCount }: { contentId: string; likeCount?: number }) {
  const token = useAuthStore((s) => s.token);
  const colors = useThemeStore((s) => s.colors);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(likeCount ?? 0);

  const handlePress = async () => {
    if (!token) {
      trackEvent([{ event_type: 'login_prompt_seen', metadata: { action: 'like' } }]);
      Alert.alert('로그인 필요', '좋아요하려면 로그인이 필요합니다.');
      return;
    }
    try {
      const result = await toggleLike(contentId);
      setLiked(result.liked);
      setCount(result.like_count);
    } catch {
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  return (
    <TouchableOpacity
      style={cardStyles.likeBtn}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
    >
      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#EF4444' : colors.textTertiary} />
      {count > 0 && <Text style={[cardStyles.likeCount, { color: colors.textTertiary }]}>{count}</Text>}
    </TouchableOpacity>
  );
}

function BlogCard({ content }: { content: Content }) {
  const colors = useThemeStore((s) => s.colors);
  const hasThumbnail = !!content.thumbnail_url;
  const [showSummary, setShowSummary] = useState(false);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', content.id],
    queryFn: () => getContentSummary(content.id),
    enabled: showSummary,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const styles = useMemo(() => StyleSheet.create({
    sourceName: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' as const },
    title: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary, lineHeight: 22, marginBottom: 6 },
    summary: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
    meta: { flexDirection: 'row' as const, marginTop: 4 },
    metaText: { fontSize: 12, color: colors.textTertiary },
    tagRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginTop: 8 },
    tagBadge: { backgroundColor: colors.primaryDim, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 },
    tagText: { fontSize: 11, color: colors.primary, fontWeight: '500' as const },
    blogThumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.searchBg, flexShrink: 0 },
    summaryToggle: { marginTop: 10, paddingVertical: 6 },
    summaryToggleText: { fontSize: 12, color: colors.primary, fontWeight: '500' as const },
    summaryBox: { marginTop: 4, backgroundColor: colors.primaryDim, borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.primary },
    summaryText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
    summaryEmpty: { fontSize: 13, color: colors.textSecondary },
  }), [colors]);

  return (
    <View style={[cardStyles.cardInner, hasThumbnail && cardStyles.cardInnerRow]}>
      <View style={hasThumbnail ? cardStyles.blogTextBlock : undefined}>
        <View style={cardStyles.rowBetween}>
          <Text style={styles.sourceName}>{content.source_name}</Text>
          <View style={cardStyles.actionGroup}>
            <LikeButton contentId={content.id} likeCount={(content as any).like_count} />
            <BookmarkButton contentId={content.id} sourceType={content.source_type} />
          </View>
        </View>
        <Text style={styles.title} numberOfLines={hasThumbnail ? 3 : 2}>{content.title}</Text>
        {content.summary && !showSummary && (
          <Text style={styles.summary} numberOfLines={2}>{content.summary}</Text>
        )}
        <View style={styles.meta}>
          {content.author && <Text style={styles.metaText}>{content.author} · </Text>}
          <Text style={styles.metaText}>{formatDate(content.published_at)}</Text>
        </View>
        {content.tags.length > 0 && (
          <View style={styles.tagRow}>
            {content.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.summaryToggle}
          onPress={() => setShowSummary((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showSummary ? 'AI 요약 접기' : 'AI 요약 보기'}
        >
          <Text style={styles.summaryToggleText}>{showSummary ? 'AI 요약 접기 ▲' : 'AI 요약 보기 ▼'}</Text>
        </TouchableOpacity>
        {showSummary && (
          <View style={styles.summaryBox}>
            {summaryLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
            ) : summaryData?.summary ? (
              <Text style={styles.summaryText}>{summaryData.summary}</Text>
            ) : (
              <Text style={styles.summaryEmpty}>요약을 불러올 수 없습니다.</Text>
            )}
          </View>
        )}
      </View>
      {hasThumbnail && (
        <Image
          source={{ uri: content.thumbnail_url }}
          style={styles.blogThumbnail}
          accessibilityLabel={`Thumbnail for ${content.title}`}
        />
      )}
    </View>
  );
}

function YoutubeCard({ content }: { content: Content }) {
  const colors = useThemeStore((s) => s.colors);
  const [showSummary, setShowSummary] = useState(false);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', content.id],
    queryFn: () => getContentSummary(content.id),
    enabled: showSummary,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const styles = useMemo(() => StyleSheet.create({
    sourceName: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' as const },
    thumbnail: { width: '100%' as const, height: 180, borderRadius: 8, marginBottom: 12, backgroundColor: colors.searchBg },
    title: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary, lineHeight: 22, marginBottom: 6 },
    summaryToggle: { marginTop: 10, paddingVertical: 6 },
    summaryToggleText: { fontSize: 12, color: colors.primary, fontWeight: '500' as const },
    summaryBox: { marginTop: 4, backgroundColor: colors.primaryDim, borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.primary },
    summaryText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
    summaryEmpty: { fontSize: 13, color: colors.textSecondary },
  }), [colors]);

  return (
    <View style={cardStyles.cardInner}>
      <View style={cardStyles.rowBetween}>
        <Text style={styles.sourceName}>{content.channel_name ?? content.source_name}</Text>
        <View style={cardStyles.actionGroup}>
          <LikeButton contentId={content.id} likeCount={(content as any).like_count} />
          <BookmarkButton contentId={content.id} sourceType={content.source_type} />
        </View>
      </View>
      {content.thumbnail_url && (
        <Image source={{ uri: content.thumbnail_url }} style={styles.thumbnail} accessibilityLabel={`Thumbnail for ${content.title}`} />
      )}
      <Text style={styles.title} numberOfLines={2}>{content.title}</Text>
      <TouchableOpacity
        style={styles.summaryToggle}
        onPress={() => setShowSummary((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={showSummary ? 'AI 요약 접기' : 'AI 요약 보기'}
      >
        <Text style={styles.summaryToggleText}>{showSummary ? 'AI 요약 접기 ▲' : 'AI 요약 보기 ▼'}</Text>
      </TouchableOpacity>
      {showSummary && (
        <View style={styles.summaryBox}>
          {summaryLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
          ) : summaryData?.summary ? (
            <Text style={styles.summaryText}>{summaryData.summary}</Text>
          ) : (
            <Text style={styles.summaryEmpty}>요약을 불러올 수 없습니다.</Text>
          )}
        </View>
      )}
    </View>
  );
}

function JobCard({ content }: { content: Content }) {
  const colors = useThemeStore((s) => s.colors);

  const styles = useMemo(() => StyleSheet.create({
    sourceName: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' as const },
    title: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary, lineHeight: 22, marginBottom: 6 },
    jobLocation: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
    tagRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginTop: 8 },
    tagBadge: { backgroundColor: colors.primaryDim, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 },
    tagText: { fontSize: 11, color: colors.primary, fontWeight: '500' as const },
    metaText: { fontSize: 12, color: colors.textTertiary },
  }), [colors]);

  return (
    <View style={cardStyles.cardInner}>
      <View style={cardStyles.rowBetween}>
        <Text style={styles.sourceName}>{content.company_name ?? content.source_name}</Text>
        <View style={cardStyles.actionGroup}>
          <LikeButton contentId={content.id} likeCount={(content as any).like_count} />
          <BookmarkButton contentId={content.id} sourceType={content.source_type} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{content.position ?? content.title}</Text>
      {content.summary && (
        <Text style={styles.jobLocation} numberOfLines={1}>{content.summary}</Text>
      )}
      {content.tags.length > 0 && (
        <View style={styles.tagRow}>
          {content.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.metaText}>{formatDate(content.published_at)}</Text>
    </View>
  );
}

export function ContentCard({ content, isNew }: ContentCardProps) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        { backgroundColor: colors.surface },
        isNew && { borderWidth: 2, borderColor: colors.primary },
      ]}
      onPress={() => router.push(`/content/${content.id}`)}
      accessibilityRole="button"
      accessibilityLabel={content.title}
    >
      {isNew && (
        <View style={[cardStyles.newBadge, { backgroundColor: colors.primary }]}>
          <Text style={cardStyles.newBadgeText}>NEW</Text>
        </View>
      )}
      {content.source_type === 'blog' && <BlogCard content={content} />}
      {content.source_type === 'youtube' && <YoutubeCard content={content} />}
      {content.source_type === 'job' && <JobCard content={content} />}
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'visible',
  },
  cardInner: { padding: 16 },
  cardInnerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  blogTextBlock: { flex: 1 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 4 },
  likeCount: { fontSize: 12 },
  newBadge: { position: 'absolute', top: -8, right: 12, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, zIndex: 1 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
});
