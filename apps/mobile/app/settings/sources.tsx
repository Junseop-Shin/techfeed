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

  // No explicit selections = all sources shown in feed
  const allShown = followedIds.size === 0;

  const handleToggle = useCallback(async (source: Source) => {
    if (!token) {
      Alert.alert('로그인 필요', '소스를 설정하려면 로그인이 필요합니다.');
      return;
    }
    setLoadingId(source._id);
    try {
      if (allShown) {
        // Transition from "show all" to selective mode:
        // follow all other sources in this tab, leave this one hidden
        const others = sources.filter((s) => s._id !== source._id);
        await Promise.all(others.map((s) => followSource(s._id, s.type)));
      } else if (followedIds.has(source._id)) {
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
  }, [token, followedIds, allShown, sources, queryClient]);

  const handleResetAll = useCallback(async () => {
    if (followedIds.size === 0) return;
    Alert.alert('전체 초기화', '모든 소스를 다시 표시하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화', onPress: async () => {
          try {
            await Promise.all(userSources.map((s) => unfollowSource(s.source_id)));
            await queryClient.invalidateQueries({ queryKey: ['userSources'] });
          } catch {
            Alert.alert('오류', '초기화에 실패했습니다.');
          }
        },
      },
    ]);
  }, [followedIds, userSources, queryClient]);

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
    headerLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary },
    resetBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    resetBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' as const },
    infoBanner: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.primaryDim,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoText: { fontSize: 12, color: colors.primary },
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
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      minWidth: 72,
      alignItems: 'center' as const,
    },
    btnActive: { backgroundColor: colors.primary },
    btnText: { fontSize: 13, fontWeight: '600' as const, color: colors.primary },
    btnTextActive: { color: '#FFFFFF' },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 60 },
    emptyText: { fontSize: 14, color: colors.textSecondary },
  }), [colors]);

  const renderItem = useCallback(({ item }: { item: Source }) => {
    // allShown = true → all sources appear as "표시 중" (active)
    const isShown = allShown || followedIds.has(item._id);
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
          style={[styles.btn, isShown && styles.btnActive]}
          onPress={() => handleToggle(item)}
          disabled={isUpdating}
          accessibilityRole="button"
          accessibilityLabel={isShown ? '피드에서 숨기기' : '피드에 표시'}
        >
          {isUpdating
            ? <ActivityIndicator size="small" color={isShown ? '#FFFFFF' : colors.primary} />
            : <Text style={[styles.btnText, isShown && styles.btnTextActive]}>
                {isShown ? '표시 중' : '숨김'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    );
  }, [allShown, followedIds, loadingId, handleToggle, styles, colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>피드 소스 설정</Text>
        </View>
        {!allShown && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetAll} accessibilityRole="button">
            <Text style={styles.resetBtnText}>전체 초기화</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          {allShown
            ? '현재 전체 소스가 피드에 표시됩니다. 숨길 소스를 탭하세요.'
            : `${followedIds.size}개 소스만 피드에 표시 중입니다.`}
        </Text>
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
