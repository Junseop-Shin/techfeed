import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { Content } from '../api/contents';
import { getContentSummary } from '../api/contents';
import { getComments, postComment } from '../api/comments';
import { useBookmarks, useToggleBookmark } from '../hooks/useBookmark';
import { addBookmarkWithType } from '../api/users';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { AuthBenefitsSheet } from './AuthBenefitsSheet';

interface ContentCardProps {
  content: Content;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BookmarkButton({ contentId, sourceType }: { contentId: string; sourceType: string }) {
  const token = useAuthStore((s) => s.token);
  const colors = useThemeStore((s) => s.colors);
  const { data: bookmarkIds } = useBookmarks();
  const { mutate: toggleBookmark } = useToggleBookmark();

  if (!token) return null;

  const isBookmarked = bookmarkIds?.has(contentId) ?? false;

  const handlePress = () => {
    if (!isBookmarked && sourceType) {
      addBookmarkWithType(contentId, sourceType).catch(() => {});
    }
    toggleBookmark({ contentId, isBookmarked });
  };

  return (
    <TouchableOpacity
      style={bookmarkStyles.bookmarkButton}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? '북마크 해제' : '북마크 추가'}
    >
      <Text style={[bookmarkStyles.bookmarkIcon, isBookmarked && { color: colors.bookmark }]}>
        {isBookmarked ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
}

const bookmarkStyles = StyleSheet.create({
  bookmarkButton: { padding: 4 },
  bookmarkIcon: { fontSize: 18, color: '#D1D5DB' },
});

function BlogCard({ content }: { content: Content }) {
  const colors = useThemeStore((s) => s.colors);
  const hasThumbnail = !!content.thumbnail_url;

  const styles = useMemo(() => StyleSheet.create({
    sourceName: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' as const },
    title: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary, lineHeight: 22, marginBottom: 6 },
    summary: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
    meta: { flexDirection: 'row' as const, marginTop: 4 },
    metaText: { fontSize: 12, color: colors.textTertiary },
    tagRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginTop: 8 },
    tagBadge: {
      backgroundColor: colors.primaryDim,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginRight: 6,
      marginBottom: 4,
    },
    tagText: { fontSize: 11, color: colors.primary, fontWeight: '500' as const },
    blogThumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.searchBg, flexShrink: 0 },
  }), [colors]);

  return (
    <View style={[cardStyles.cardInner, hasThumbnail && cardStyles.cardInnerRow]}>
      <View style={hasThumbnail ? cardStyles.blogTextBlock : undefined}>
        <View style={cardStyles.rowBetween}>
          <Text style={styles.sourceName}>{content.source_name}</Text>
          <BookmarkButton contentId={content.id} sourceType={content.source_type} />
        </View>
        <Text style={styles.title} numberOfLines={hasThumbnail ? 3 : 2}>
          {content.title}
        </Text>
        {content.summary && (
          <Text style={styles.summary} numberOfLines={2}>
            {content.summary}
          </Text>
        )}
        <View style={styles.meta}>
          {content.author && (
            <Text style={styles.metaText}>{content.author} · </Text>
          )}
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
    summaryBox: {
      marginTop: 4,
      backgroundColor: colors.primaryDim,
      borderRadius: 8,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    summaryText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
    summaryEmpty: { fontSize: 13, color: colors.textSecondary },
  }), [colors]);

  return (
    <View style={cardStyles.cardInner}>
      <View style={cardStyles.rowBetween}>
        <Text style={styles.sourceName}>
          {content.channel_name ?? content.source_name}
        </Text>
        <BookmarkButton contentId={content.id} sourceType={content.source_type} />
      </View>
      {content.thumbnail_url && (
        <Image
          source={{ uri: content.thumbnail_url }}
          style={styles.thumbnail}
          accessibilityLabel={`Thumbnail for ${content.title}`}
        />
      )}
      <Text style={styles.title} numberOfLines={2}>{content.title}</Text>

      <TouchableOpacity
        style={styles.summaryToggle}
        onPress={() => setShowSummary((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={showSummary ? 'AI 요약 접기' : 'AI 요약 보기'}
      >
        <Text style={styles.summaryToggleText}>
          {showSummary ? 'AI 요약 접기 ▲' : 'AI 요약 보기 ▼'}
        </Text>
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
    tagBadge: {
      backgroundColor: colors.primaryDim,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginRight: 6,
      marginBottom: 4,
    },
    tagText: { fontSize: 11, color: colors.primary, fontWeight: '500' as const },
    metaText: { fontSize: 12, color: colors.textTertiary },
  }), [colors]);

  return (
    <View style={cardStyles.cardInner}>
      <View style={cardStyles.rowBetween}>
        <Text style={styles.sourceName}>{content.company_name ?? content.source_name}</Text>
        <BookmarkButton contentId={content.id} sourceType={content.source_type} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {content.position ?? content.title}
      </Text>
      {content.summary && (
        <Text style={styles.jobLocation} numberOfLines={1}>
          {content.summary}
        </Text>
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

function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function CommentSection({ contentId }: { contentId: string }) {
  const colors = useThemeStore((s) => s.colors);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [benefitsVisible, setBenefitsVisible] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', contentId],
    queryFn: () => getComments(contentId),
  });

  const { mutate: submitComment, isPending: isSubmitting } = useMutation({
    mutationFn: (body: string) => postComment(contentId, body),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', contentId] });
    },
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginTop: 12,
          backgroundColor: colors.surfaceHigh,
          borderRadius: 8,
          padding: 12,
        },
        sectionTitle: {
          fontSize: 13,
          fontWeight: '600' as const,
          color: colors.textPrimary,
          marginBottom: 10,
        },
        commentItem: {
          marginBottom: 10,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        commentHeader: {
          flexDirection: 'row' as const,
          justifyContent: 'space-between' as const,
          marginBottom: 3,
        },
        commentAuthor: {
          fontSize: 12,
          fontWeight: '600' as const,
          color: colors.textPrimary,
        },
        commentDate: {
          fontSize: 11,
          color: colors.textTertiary,
        },
        commentBody: {
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 18,
        },
        inputRow: {
          flexDirection: 'row' as const,
          gap: 8,
          marginTop: 8,
        },
        input: {
          flex: 1,
          backgroundColor: colors.searchBg,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 13,
          color: colors.textPrimary,
          minHeight: 36,
        },
        submitButton: {
          backgroundColor: colors.primary,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
        submitButtonText: {
          fontSize: 13,
          fontWeight: '600' as const,
          color: '#FFFFFF',
        },
        emptyText: {
          fontSize: 12,
          color: colors.textTertiary,
          textAlign: 'center' as const,
          paddingVertical: 8,
        },
      }),
    [colors]
  );

  const visibleComments = comments?.slice(0, 5) ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>댓글 {comments ? `(${comments.length})` : ''}</Text>

      {isLoading && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
      )}

      {!isLoading && visibleComments.length === 0 && (
        <Text style={styles.emptyText}>첫 댓글을 남겨보세요.</Text>
      )}

      {visibleComments.map((comment) => (
        <View key={comment.id} style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{comment.author_name}</Text>
            <Text style={styles.commentDate}>{formatCommentDate(comment.created_at)}</Text>
          </View>
          <Text style={styles.commentBody}>{comment.body}</Text>
        </View>
      ))}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="댓글을 입력하세요..."
          placeholderTextColor={colors.textSecondary}
          multiline
          returnKeyType="default"
          accessibilityLabel="댓글 입력"
          onFocus={() => {
            if (!token) {
              setBenefitsVisible(true);
            }
          }}
          editable={!!token}
        />
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            if (!token) {
              setBenefitsVisible(true);
              return;
            }
            const trimmed = commentText.trim();
            if (trimmed) {
              submitComment(trimmed);
            }
          }}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="댓글 등록"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>등록</Text>
          )}
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
    </View>
  );
}

export function ContentCard({ content }: ContentCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    setExpanded((v) => !v);
  };

  const handleNavigate = () => {
    router.push(`/content/${content.id}`);
  };

  return (
    <TouchableOpacity
      style={[cardStyles.card, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={content.title}
      accessibilityState={{ expanded }}
    >
      {content.source_type === 'blog' && <BlogCard content={content} />}
      {content.source_type === 'youtube' && <YoutubeCard content={content} />}
      {content.source_type === 'job' && <JobCard content={content} />}

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <TouchableOpacity
            onPress={handleNavigate}
            accessibilityRole="link"
            accessibilityLabel="전체 글 보기"
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.primary,
                fontWeight: '500',
                marginBottom: 8,
              }}
            >
              전체 글 보기 →
            </Text>
          </TouchableOpacity>
          <CommentSection contentId={content.id} />
        </View>
      )}
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
  },
  cardInner: { padding: 16 },
  cardInnerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  blogTextBlock: { flex: 1 },
});
