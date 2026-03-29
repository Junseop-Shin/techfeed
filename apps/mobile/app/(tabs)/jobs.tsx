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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ContentCard } from '../../src/components/ContentCard';
import { getContents } from '../../src/api/contents';
import { getProfile } from '../../src/api/users';
import { useThemeStore } from '../../src/store/theme.store';
import { useAuthStore } from '../../src/store/auth.store';
import { useSeenStore } from '../../src/store/seen.store';
import { COMMON_TAGS, expandTagsForQuery, tagsToCategories } from '../../src/constants/tags';
import type { Content, ContentsParams } from '../../src/api/contents';
import { trackEvent } from '../../src/api/analytics';

type SortOption = { label: string; value: ContentsParams['sort'] };
const SORT_OPTIONS: SortOption[] = [
  { label: '최신순', value: 'date' },
  { label: '조회순', value: 'views' },
  { label: '좋아요순', value: 'likes' },
  { label: '북마크순', value: 'bookmarks' },
];

export default function JobsScreen() {
  const colors = useThemeStore((s) => s.colors);
  const token = useAuthStore((s) => s.token);
  const { isNew: checkIsNew, markVisited } = useSeenStore();

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<ContentsParams['sort']>('date');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Content[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterInitRef = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (profile?.tags && !initializedRef.current) {
      const cats = tagsToCategories(profile.tags);
      if (cats.length > 0) setSelectedCategories(cats);
      initializedRef.current = true;
    }
  }, [profile?.tags]);

  useEffect(() => {
    const timer = setTimeout(() => markVisited('job'), 3000);
    return () => clearTimeout(timer);
  }, [markVisited]);

  const tagsParam = useMemo(() => {
    const expanded = expandTagsForQuery(selectedCategories);
    return expanded.length > 0 ? expanded.join(',') : undefined;
  }, [selectedCategories]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['contents', { source_type: 'job', q: submittedQuery, tags: tagsParam, page: 1, sort }],
    queryFn: () => getContents({ source_type: 'job', q: submittedQuery || undefined, tags: tagsParam, page: 1, limit: 20, sort }),
  });

  useEffect(() => { setPage(1); setAllItems([]); }, [submittedQuery, tagsParam, sort]);

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
      const result = await getContents({ source_type: 'job', q: submittedQuery || undefined, tags: tagsParam, page: nextPage, limit: 20, sort });
      setAllItems((prev) => [...prev, ...result.items]);
      setHasMore(allItems.length + result.items.length < result.total);
      setPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, submittedQuery, tagsParam, sort, allItems.length]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSubmittedQuery(text), 300);
  }, []);

  const toggleCategory = useCallback((value: string) => {
    setSelectedCategories((prev) => prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setAllItems([]);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // tab_visit: once on mount
  useEffect(() => {
    trackEvent([{ event_type: 'tab_visit', metadata: { tab: 'jobs' } }]);
  }, []);

  // search tracking: when debounced query is submitted
  useEffect(() => {
    if (submittedQuery) {
      trackEvent([{ event_type: 'search', metadata: { tab: 'jobs', q: submittedQuery } }]);
    }
  }, [submittedQuery]);

  // filter_apply: when categories or sort changes (after initial mount)
  useEffect(() => {
    if (!filterInitRef.current) { filterInitRef.current = true; return; }
    trackEvent([{ event_type: 'filter_apply', metadata: { tab: 'jobs', categories: selectedCategories, sort } }]);
  }, [selectedCategories, sort]);

  const renderItem = useCallback(
    ({ item }: { item: Content }) => (
      <ContentCard content={item} isNew={checkIsNew('job', item.published_at)} />
    ),
    [checkIsNew]
  );

  const keyExtractor = useCallback((item: Content) => item.id, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
    bookmarkBtn: { padding: 4 },
    filterRow: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' as const },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.searchBg, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary },
    chipTextActive: { color: colors.primary },
    sortRow: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    sortContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 6, flexDirection: 'row' as const },
    sortChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.searchBg, borderWidth: 1, borderColor: colors.border },
    sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    sortChipText: { fontSize: 12, fontWeight: '500' as const, color: colors.textSecondary },
    sortChipTextActive: { color: '#FFFFFF', fontWeight: '600' as const },
    searchBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    searchInput: { backgroundColor: colors.searchBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.textPrimary },
    list: { paddingVertical: 8, paddingBottom: 24 },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 80 },
    errorText: { fontSize: 14, color: '#EF4444' },
    emptyText: { fontSize: 14, color: colors.textSecondary },
    loadMoreBtn: { marginHorizontal: 16, marginVertical: 16, paddingVertical: 12, backgroundColor: colors.surface, borderRadius: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: colors.border },
    loadMoreText: { fontSize: 14, fontWeight: '600' as const, color: colors.primary },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채용공고</Text>
        <TouchableOpacity onPress={() => router.push('/bookmarks/jobs')} style={styles.bookmarkBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="bookmark-outline" size={22} color={colors.bookmark} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {COMMON_TAGS.map((tag) => {
            const active = selectedCategories.includes(tag.value);
            return (
              <TouchableOpacity key={tag.value} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleCategory(tag.value)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sortRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContent}>
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <TouchableOpacity key={opt.value} style={[styles.sortChip, active && styles.sortChipActive]} onPress={() => setSort(opt.value)}>
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.searchBar}>
        <TextInput style={styles.searchInput} value={query} onChangeText={handleChangeText} placeholder="회사명, 포지션, 기술스택 검색..." placeholderTextColor={colors.textSecondary} returnKeyType="search" autoCorrect={false} autoCapitalize="none" />
      </View>

      {isLoading && !refreshing && <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>}
      {isError && <View style={styles.center}><Text style={styles.errorText}>콘텐츠를 불러올 수 없습니다.</Text></View>}
      {!isLoading && !isError && (
        <FlatList
          data={allItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>채용공고가 없습니다.</Text></View>}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.loadMoreText}>더보기</Text>}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
