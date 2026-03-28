import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Content } from '../api/contents';
import { getContentSummary } from '../api/contents';
import { useBookmarks, useToggleBookmark } from '../hooks/useBookmark';
import { addBookmarkWithType } from '../api/users';
import { useAuthStore } from '../store/auth.store';

interface ContentCardProps {
  content: Content;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BookmarkButton({ contentId, sourceType }: { contentId: string; sourceType: string }) {
  const token = useAuthStore((s) => s.token);
  const { data: bookmarkIds } = useBookmarks();
  const { mutate: toggleBookmark } = useToggleBookmark();

  if (!token) return null;

  const isBookmarked = bookmarkIds?.has(contentId) ?? false;

  const handlePress = () => {
    if (!isBookmarked && sourceType) {
      // Add with content type so the backend can categorise the bookmark
      addBookmarkWithType(contentId, sourceType).catch(() => {
        // Fallback: optimistic update still proceeds via toggleBookmark
      });
    }
    toggleBookmark({ contentId, isBookmarked });
  };

  return (
    <TouchableOpacity
      style={styles.bookmarkButton}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? '북마크 해제' : '북마크 추가'}
    >
      <Text style={[styles.bookmarkIcon, isBookmarked && styles.bookmarkIconActive]}>
        {isBookmarked ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
}

function BlogCard({ content }: { content: Content }) {
  const hasThumbnail = !!content.thumbnail_url;

  return (
    <View style={[styles.cardInner, hasThumbnail && styles.cardInnerRow]}>
      <View style={hasThumbnail ? styles.blogTextBlock : undefined}>
        <View style={styles.rowBetween}>
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
  const [showSummary, setShowSummary] = useState(false);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', content.id],
    queryFn: () => getContentSummary(content.id),
    enabled: showSummary,
    staleTime: 1000 * 60 * 60 * 24, // 24h — 요약은 자주 바뀌지 않음
  });

  return (
    <View style={styles.cardInner}>
      <View style={styles.rowBetween}>
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
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 8 }} />
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
  return (
    <View style={styles.cardInner}>
      <View style={styles.rowBetween}>
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

export function ContentCard({ content }: ContentCardProps) {
  const handlePress = () => {
    router.push(`/content/${content.id}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={content.title}
    >
      {content.source_type === 'blog' && <BlogCard content={content} />}
      {content.source_type === 'youtube' && <YoutubeCard content={content} />}
      {content.source_type === 'job' && <JobCard content={content} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInner: {
    padding: 16,
  },
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
  blogTextBlock: {
    flex: 1,
  },
  blogThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  sourceName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  summary: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  jobLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  bookmarkButton: {
    padding: 4,
  },
  bookmarkIcon: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  bookmarkIconActive: {
    color: '#F59E0B',
  },
  summaryToggle: {
    marginTop: 10,
    paddingVertical: 6,
  },
  summaryToggleText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  summaryBox: {
    marginTop: 4,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  summaryText: {
    fontSize: 13,
    color: '#1E3A5F',
    lineHeight: 20,
  },
  summaryEmpty: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
