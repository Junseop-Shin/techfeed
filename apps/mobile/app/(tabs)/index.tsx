import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SourceTypeTabs, type SourceType } from '../../src/components/SourceTypeTabs';
import { ContentCard } from '../../src/components/ContentCard';
import { useContents } from '../../src/hooks/useContents';
import type { Content } from '../../src/api/contents';

export default function FeedScreen() {
  const [sourceType, setSourceType] = useState<SourceType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const params = {
    source_type: sourceType === 'all' ? undefined : sourceType,
  };

  const { data, isLoading, isError, refetch } = useContents(params);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: Content }) => <ContentCard content={item} />,
    []
  );

  const keyExtractor = useCallback((item: Content) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TechFeed</Text>
      </View>
      <SourceTypeTabs selected={sourceType} onChange={setSourceType} />
      {isLoading && !refreshing && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>콘텐츠를 불러올 수 없습니다.</Text>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={data?.items ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>콘텐츠가 없습니다.</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
