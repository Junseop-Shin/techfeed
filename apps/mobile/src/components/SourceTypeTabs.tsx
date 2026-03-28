import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeStore } from '../store/theme.store';

export type SourceType = 'all' | 'blog' | 'youtube' | 'job';

const TABS: { value: SourceType; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'blog', label: '블로그' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'job', label: '채용공고' },
];

interface SourceTypeTabsProps {
  selected: SourceType;
  onChange: (type: SourceType) => void;
}

export function SourceTypeTabs({ selected, onChange }: SourceTypeTabsProps) {
  const colors = useThemeStore((s) => s.colors);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    content: { paddingHorizontal: 16 },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginRight: 4,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabSelected: { borderBottomColor: colors.primary },
    label: { fontSize: 14, fontWeight: '500' as const, color: colors.textSecondary },
    labelSelected: { color: colors.primary },
  }), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          style={[styles.tab, selected === tab.value && styles.tabSelected]}
          onPress={() => onChange(tab.value)}
          accessibilityRole="tab"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: selected === tab.value }}
        >
          <Text style={[styles.label, selected === tab.value && styles.labelSelected]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
