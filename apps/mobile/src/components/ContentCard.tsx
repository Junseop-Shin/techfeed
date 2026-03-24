import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Content } from '../api/contents';

interface ContentCardProps {
  content: Content;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BlogCard({ content }: { content: Content }) {
  return (
    <View style={styles.cardInner}>
      <Text style={styles.sourceName}>{content.source_name}</Text>
      <Text style={styles.title} numberOfLines={2}>{content.title}</Text>
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
  );
}

function YoutubeCard({ content }: { content: Content }) {
  return (
    <View style={styles.cardInner}>
      {content.thumbnail_url && (
        <Image
          source={{ uri: content.thumbnail_url }}
          style={styles.thumbnail}
          accessibilityLabel={`Thumbnail for ${content.title}`}
        />
      )}
      <Text style={styles.title} numberOfLines={2}>{content.title}</Text>
      <Text style={styles.sourceName}>
        {content.channel_name ?? content.source_name}
      </Text>
    </View>
  );
}

function JobCard({ content }: { content: Content }) {
  return (
    <View style={styles.cardInner}>
      <Text style={styles.sourceName}>{content.company_name ?? content.source_name}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {content.position ?? content.title}
      </Text>
      {content.tags.length > 0 && (
        <View style={styles.tagRow}>
          {content.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
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
});

/*
Usage:
<ContentCard content={content} />
*/
