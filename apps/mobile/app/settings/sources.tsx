import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../src/store/theme.store';
import { useAuthStore } from '../../src/store/auth.store';
import { getSources, getUserSources, followSource, unfollowSource } from '../../src/api/sources';
import type { Source } from '../../src/api/sources';

const TABS = [
  { label: '블로그', value: 'blog' },
  { label: 'YouTube', value: 'youtube' },
  { label: '채용', value: 'job' },
] as const;

type TabValue = typeof TABS[number]['value'];

export default function SourcesScreen() {
  const colors = useThemeStore((s) => s.colors);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>('blog');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ['sources', activeTab],
    queryFn: () => getSources(activeTab),
  });

  const { data: userSources = [] } = useQuery({
    queryKey: ['userSources'],
    queryFn: getUserSources,
    enabled: !!token,
  });

  const followedIds = useMemo(
    () => new Set(userSources.map((s) => s.source_id)),
    [userSources]
  );

  const handleToggle = useCallback(async (source: Source) => {
    if (!token) {
      Alert.alert('로그인 필요', '소스를 팔로우하려면 로그인이 필요합니다.');
      return;
    }
    setLoadingId(source._id);
    try {
      if (followedIds.has(source._id)) {
        await unfollowSource(source._id);
      } else {
        await followSource(source._id, source.type);
      }
      await queryClient.invalidateQueries({ queryKey: ['userSources'] });
    } catch {
      Alert.alert('오류', '소스 설정에 실패했습니다.');
    } finally {
      setLoadingId(null);
    }
  }, [token, followedIds, queryClient]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary },
    tabRow: {
      flexDirection: 'row' as const,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      gap: 4,
    },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '500' as const, color: colors.textSecondary },
    tabTextActive: { color: colors.primary, fontWeight: '600' as const },
    list: { paddingVertical: 8 },
    item: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemInfo: { flex: 1, marginRight: 12 },
    itemName: { fontSize: 15, fontWeight: '500' as const, color: colors.textPrimary },
    itemTags: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    followBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      minWidth: 72,
      alignItems: 'center' as const,
    },
    followBtnActive: { backgroundColor: colors.primary },
    followBtnText: { fontSize: 13, fontWeight: '600' as const, color: colors.primary },
    followBtnTextActive: { color: '#FFFFFF' },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 60 },
    emptyText: { fontSize: 14, color: colors.textSecondary },
  }), [colors]);

  const renderItem = useCallback(({ item }: { item: Source }) => {
    const followed = followedIds.has(item._id);
    const isUpdating = loadingId === item._id;
    return (
      <View style={styles.item}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.tags.length > 0 && (
            <Text style={styles.itemTags}>{item.tags.slice(0, 3).join(' · ')}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.followBtn, followed && styles.followBtnActive]}
          onPress={() => handleToggle(item)}
          disabled={isUpdating}
          accessibilityRole="button"
          accessibilityLabel={followed ? '팔로우 취소' : '팔로우'}
        >
          {isUpdating
            ? <ActivityIndicator size="small" color={followed ? '#FFFFFF' : colors.primary} />
            : <Text style={[styles.followBtnText, followed && styles.followBtnTextActive]}>
                {followed ? '팔로잉' : '팔로우'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    );
  }, [followedIds, loadingId, handleToggle, styles, colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>소스 팔로우 관리</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && styles.tabActive]}
            onPress={() => setActiveTab(tab.value)}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sourcesLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sources}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>소스가 없습니다.</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}
