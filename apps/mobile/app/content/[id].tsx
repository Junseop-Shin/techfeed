import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useContentById } from '../../src/hooks/useContents';

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: content, isLoading, isError } = useContentById(id ?? '');

  const handleOpenExternal = () => {
    if (content?.url) {
      Linking.openURL(content.url).catch(() => {
        // Silently fail — URL may not be valid
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !content) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>콘텐츠를 불러올 수 없습니다.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.meta}>
          <Text style={styles.sourceType}>{sourceTypeLabel(content.source_type)}</Text>
          <Text style={styles.sourceName}>{content.source_name}</Text>
        </View>

        <Text style={styles.title}>{content.title}</Text>

        {content.published_at && (
          <Text style={styles.date}>
            {new Date(content.published_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        )}

        {content.tags.length > 0 && (
          <View style={styles.tagRow}>
            {content.tags.map((tag) => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.urlLabel}>원문 링크</Text>
        <Text style={styles.url} numberOfLines={2}>{content.url}</Text>

        <TouchableOpacity
          style={styles.openButton}
          onPress={handleOpenExternal}
          accessibilityRole="button"
          accessibilityLabel="원문 열기"
        >
          <Text style={styles.openButtonText}>원문 보기</Text>
        </TouchableOpacity>
      </View>
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sourceType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sourceName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 30,
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tagBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  url: {
    fontSize: 13,
    color: '#2563EB',
    marginBottom: 20,
    lineHeight: 18,
  },
  openButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 14,
    color: '#2563EB',
  },
});
