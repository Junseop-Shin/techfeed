import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useContentById } from '../../src/hooks/useContents';
import { trackEvent } from '../../src/api/contents';
import { useThemeStore } from '../../src/store/theme.store';
import { CommentSection } from '../../src/components/CommentSection';

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: content, isLoading, isError } = useContentById(id ?? '');
  const enteredAtRef = useRef<number>(Date.now());
  const colors = useThemeStore((s) => s.colors);

  useEffect(() => {
    if (!id) return;

    enteredAtRef.current = Date.now();
    trackEvent([{ event_type: 'click', content_id: id }]);

    return () => {
      const duration_ms = Date.now() - enteredAtRef.current;
      trackEvent([{ event_type: 'read', content_id: id, duration_ms }]);
    };
  }, [id]);

  const handleOpenExternal = () => {
    if (content?.url) {
      Linking.openURL(content.url).catch(() => {
        // Silently fail — URL may not be valid
      });
    }
  };

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
          <Text style={[styles.errorText, { color: colors.danger }]}>콘텐츠를 불러올 수 없습니다.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
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
              year: 'numeric',
              month: 'long',
              day: 'numeric',
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
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginRight: 8,
  },
  sourceType: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tagBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryBox: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  url: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  openButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
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
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 14,
  },
});
