import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ContentCard } from '../../src/components/ContentCard';
import { getContents } from '../../src/api/contents';
import { useThemeStore } from '../../src/store/theme.store';
import type { Content } from '../../src/api/contents';

const BLOG_TAGS = ['React', 'TypeScript', 'Python', 'AI/ML', 'DevOps', 'Kubernetes', 'Go', 'Rust', 'AWS', 'Next.js'];

const SUBJECT_FILTERS = [
  { label: 'AI', tags: ['ai', 'llm', 'gpt'] },
  { label: '백엔드', tags: ['java', 'python', 'golang', 'kotlin', 'msa', 'database'] },
  { label: '프론트', tags: ['react', 'typescript', 'nextjs', 'swift'] },
  { label: '보안', tags: ['security'] },
  { label: 'DevOps', tags: ['devops', 'kubernetes', 'docker', 'aws'] },
] as const;

export default function BlogScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Content[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const combinedTags = useMemo(() => {
    const subjectTags = SUBJECT_FILTERS.find((s) => s.label === selectedSubject)?.tags ?? [];
    const all = [...subjectTags, ...selectedTags];
    return all.length > 0 ? all.join(',') : undefined;
  }, [selectedSubject, selectedTags]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['contents', { source_type: 'blog', q: submittedQuery, tags: combinedTags, page: 1 }],
    queryFn: () => getContents({ source_type: 'blog', q: submittedQuery || undefined, tags: combinedTags, page: 1, limit: 20 }),
  });

  useEffect(() => {
    setPage(1);
    setAllItems([]);
  }, [submittedQuery, combinedTags]);

  useEffect(() => {
    if (data?.items) {
      setAllItems(data.items);
      setHasMore(data.items.length < data.total);
    }
  }, [data]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getContents({ source_type: 'blog', q: submittedQuery || undefined, tags: combinedTags, page: nextPage, limit: 20 });
      setAllItems(prev => [...prev, ...result.items]);
      setHasMore(allItems.length + result.items.length < result.total);
      setPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, submittedQuery, combinedTags, allItems.length]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSubmittedQuery(text);
    }, 300);
  }, []);

  const toggleSubject = useCallback((label: string) => {
    setSelectedSubject((prev) => (prev === label ? null : label));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setAllItems([]);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: Content }) => <ContentCard content={item} />,
    []
  );

  const keyExtractor = useCallback((item: Content) => item.id, []);

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
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
    bookmarkBtn: { padding: 4 },
    bookmarkBtnIcon: { fontSize: 22, color: colors.bookmark },
    searchBar: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInput: {
      backgroundColor: colors.searchBg,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
    },
    tagsWrapper: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tagsContent: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      flexDirection: 'row' as const,
    },
    tagChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.searchBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagChipActive: {
      backgroundColor: colors.primaryDim,
      borderColor: colors.primary,
    },
    tagChipText: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary },
    tagChipTextActive: { color: colors.primary },
    subjectRow: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subjectContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      flexDirection: 'row' as const,
    },
    subjectChip: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.searchBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subjectChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    subjectChipText: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
    subjectChipTextActive: { color: '#FFFFFF' },
    list: { paddingVertical: 8, paddingBottom: 24 },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 80 },
    errorText: { fontSize: 14, color: '#EF4444' },
    emptyText: { fontSize: 14, color: colors.textSecondary },
    loadMoreBtn: {
      marginHorizontal: 16,
      marginVertical: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadMoreText: { fontSize: 14, fontWeight: '600' as const, color: colors.primary },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>블로그</Text>
        <TouchableOpacity
          onPress={() => router.push('/bookmarks/blog')}
          style={styles.bookmarkBtn}
          accessibilityRole="button"
          accessibilityLabel="블로그 북마크 보기"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.bookmarkBtnIcon}>★</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subjectRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectContent}
        >
          {SUBJECT_FILTERS.map((s) => {
            const active = selectedSubject === s.label;
            return (
              <TouchableOpacity
                key={s.label}
                style={[styles.subjectChip, active && styles.subjectChipActive]}
                onPress={() => toggleSubject(s.label)}
                accessibilityRole="radio"
                accessibilityLabel={s.label}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.subjectChipText, active && styles.subjectChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleChangeText}
          placeholder="블로그 검색..."
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          accessibilityLabel="블로그 검색어 입력"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.tagsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContent}
        >
          {BLOG_TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
                accessibilityRole="checkbox"
                accessibilityLabel={tag}
                accessibilityState={{ checked: active }}
              >
                <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && !refreshing && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>콘텐츠를 불러올 수 없습니다.</Text>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={allItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>블로그 포스트가 없습니다.</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={loadMore}
                disabled={isLoadingMore}
                accessibilityRole="button"
                accessibilityLabel="더보기"
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>더보기</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
