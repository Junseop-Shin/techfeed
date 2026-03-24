import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ContentCard } from '../../src/components/ContentCard';
import { TagChip } from '../../src/components/TagChip';
import { useContents, useAutocomplete } from '../../src/hooks/useContents';
import type { Content } from '../../src/api/contents';

const POPULAR_TAGS = ['React', 'TypeScript', 'Python', 'AI/ML', 'DevOps', 'Kubernetes'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: suggestions } = useAutocomplete(showAutocomplete ? query : '');

  const searchParams = {
    q: submittedQuery || undefined,
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
  };

  const { data, isLoading } = useContents(searchParams);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    setShowAutocomplete(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      // autocomplete updates automatically via query state
    }, 300);
  }, []);

  const handleSubmit = useCallback(() => {
    setSubmittedQuery(query);
    setShowAutocomplete(false);
  }, [query]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setSubmittedQuery(suggestion);
    setShowAutocomplete(false);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const renderContent = useCallback(
    ({ item }: { item: Content }) => <ContentCard content={item} />,
    []
  );

  const keyExtractor = useCallback((item: Content) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          placeholder="기술 블로그, 영상, 채용공고 검색..."
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          accessibilityLabel="검색어 입력"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {showAutocomplete && suggestions && suggestions.length > 0 && (
        <View style={styles.autocomplete}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(s)}
              accessibilityRole="button"
              accessibilityLabel={`검색어 제안: ${s}`}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.tagSection}>
        <Text style={styles.tagSectionLabel}>태그 필터</Text>
        <View style={styles.tagRow}>
          {POPULAR_TAGS.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              selected={selectedTags.includes(tag)}
              onPress={() => toggleTag(tag)}
            />
          ))}
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}

      {!isLoading && (
        <FlatList
          data={data?.items ?? []}
          renderItem={renderContent}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {submittedQuery ? '검색 결과가 없습니다.' : '검색어를 입력하세요.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  autocomplete: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 10,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#374151',
  },
  tagSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tagSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
