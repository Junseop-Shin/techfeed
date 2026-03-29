import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useContentById } from '../../src/hooks/useContents';
import { trackEvent, toggleLike, getLikeStatus } from '../../src/api/contents';
import { addBookmarkWithType, removeBookmark, updateBookmarkStatus } from '../../src/api/users';
import { useBookmarks } from '../../src/hooks/useBookmark';
import { useThemeStore } from '../../src/store/theme.store';
import { useAuthStore } from '../../src/store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { CommentSection } from '../../src/components/CommentSection';

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: content, isLoading, isError } = useContentById(id ?? '');
  const enteredAtRef = useRef<number>(Date.now());
  const colors = useThemeStore((s) => s.colors);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { data: bookmarkIds } = useBookmarks();
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  // BUG-001 fix: only track read if user stayed >= 3 seconds
  useEffect(() => {
    if (!id) return;
    enteredAtRef.current = Date.now();
    trackEvent([{ event_type: 'click', content_id: id }]);
    return () => {
      const duration_ms = Date.now() - enteredAtRef.current;
      if (duration_ms >= 3000) {
        trackEvent([{ event_type: 'read', content_id: id, duration_ms }]);
      }
    };
  }, [id]);

  // Initialize like count from content data + fetch liked state
  useEffect(() => {
    if (content && likeCount === null) {
      setLikeCount((content as any).like_count ?? 0);
    }
  }, [content, likeCount]);

  useEffect(() => {
    if (!token || !id) return;
    getLikeStatus(id).then((r) => setIsLiked(r.liked)).catch(() => {});
  }, [token, id]);

  const isBookmarked = bookmarkIds?.has(id ?? '') ?? false;

  const handleBookmark = useCallback(() => {
    if (!token || !id || !content) return;
    if (isBookmarked) {
      removeBookmark(id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['bookmarks'] }))
        .catch(() => Alert.alert('오류', '북마크 취소에 실패했습니다.'));
    } else {
      addBookmarkWithType(id, (content as any).source_type ?? (content as any).type, 'done')
        .then(() => queryClient.invalidateQueries({ queryKey: ['bookmarks'] }))
        .catch(() => Alert.alert('오류', '북마크 저장에 실패했습니다.'));
    }
  }, [token, id, content, isBookmarked, queryClient]);

  const handleShare = useCallback(async () => {
    if (!content) return;
    try {
      await Share.share({ message: content.url, url: content.url });
      // Auto-bookmark as '공유함' after sharing
      if (token && id) {
        if (isBookmarked) {
          updateBookmarkStatus(id, 'shared')
            .then(() => queryClient.invalidateQueries({ queryKey: ['bookmarks'] }))
            .catch(() => {});
        } else {
          addBookmarkWithType(id, (content as any).source_type ?? (content as any).type, 'shared')
            .then(() => queryClient.invalidateQueries({ queryKey: ['bookmarks'] }))
            .catch(() => {});
        }
        trackEvent([{ event_type: 'share', content_id: id }]);
      }
    } catch {
      // Share dialog dismissed — do nothing
    }
  }, [content, token, id, isBookmarked, queryClient]);

  const handleLike = useCallback(async () => {
    if (!token || !id) return;
    // Optimistic update — reflect immediately
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((prev) => (prev ?? 0) + (newLiked ? 1 : -1));
    try {
      const result = await toggleLike(id);
      setIsLiked(result.liked);
      setLikeCount(result.like_count);
    } catch {
      // Revert on failure
      setIsLiked(!newLiked);
      setLikeCount((prev) => (prev ?? 0) + (newLiked ? -1 : 1));
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  }, [token, id, isLiked]);

  const handleOpenExternal = useCallback(() => {
    if (content?.url) {
      Linking.openURL(content.url).catch(() => {});
    }
  }, [content?.url]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !content) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>콘텐츠를 불러올 수 없습니다.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <Text style={[styles.backButtonText, { color: colors.primary }]}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.meta}>
          <Text style={[styles.sourceType, { color: colors.primary, backgroundColor: colors.primaryDim }]}>
            {sourceTypeLabel(content.source_type)}
          </Text>
          <Text style={[styles.sourceName, { color: colors.textSecondary }]}>{content.source_name}</Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{content.title}</Text>

        {content.published_at && (
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {new Date(content.published_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
        )}

        {content.tags.length > 0 && (
          <View style={styles.tagRow}>
            {content.tags.map((tag) => (
              <View key={tag} style={[styles.tagBadge, { backgroundColor: colors.primaryDim }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {content.summary && (
          <View style={[styles.summaryBox, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{content.summary}</Text>
          </View>
        )}

        {/* Action buttons: like, bookmark, share */}
        <View style={[styles.actionRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            disabled={!token}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? '좋아요 취소' : '좋아요'}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#EF4444' : colors.textSecondary}
            />
            {likeCount !== null && likeCount > 0 && (
              <Text style={[styles.actionCount, { color: colors.textSecondary }]}>{likeCount}</Text>
            )}
          </TouchableOpacity>

          {token && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleBookmark}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? '완독으로 북마크' : '완독 북마크 추가'}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isBookmarked ? colors.bookmark : colors.textSecondary}
              />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>완독</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="공유하기"
          >
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>공유</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.urlLabel, { color: colors.textSecondary }]}>원문 링크</Text>
        <Text style={[styles.url, { color: colors.primary }]} numberOfLines={2}>{content.url}</Text>

        <TouchableOpacity
          style={[styles.openButton, { backgroundColor: colors.primary }]}
          onPress={handleOpenExternal}
          accessibilityRole="button"
          accessibilityLabel="원문 열기"
        >
          <Text style={styles.openButtonText}>원문 보기</Text>
        </TouchableOpacity>

        <CommentSection contentId={content.id} />
      </ScrollView>
    </SafeAreaView>
  );
}

function sourceTypeLabel(type: string): string {
  switch (type) {
    case 'blog': return '블로그';
    case 'youtube': return 'YouTube';
    case 'job': return '채용공고';
    default: return type;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  meta: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginRight: 8 },
  sourceType: {
    fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, overflow: 'hidden', marginRight: 8,
  },
  sourceName: { fontSize: 13, fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 30, marginBottom: 8 },
  date: { fontSize: 13, marginBottom: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  tagBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  tagText: { fontSize: 12, fontWeight: '500' },
  summaryBox: { borderRadius: 8, padding: 14, marginBottom: 16, borderLeftWidth: 3 },
  summaryText: { fontSize: 14, lineHeight: 22 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  actionCount: { fontSize: 14, fontWeight: '600' },
  actionLabel: { fontSize: 13 },
  divider: { height: 1, marginVertical: 20 },
  urlLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  url: { fontSize: 13, marginBottom: 20, lineHeight: 18 },
  openButton: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  openButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, marginBottom: 16 },
  backButton: { paddingHorizontal: 20, paddingVertical: 10 },
  backButtonText: { fontSize: 14 },
});
