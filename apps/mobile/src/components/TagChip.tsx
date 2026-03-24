import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function TagChip({ label, selected = false, onPress }: TagChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Tag: ${label}`}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  label: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});

/*
Usage:
<TagChip label="React" selected={true} onPress={() => toggleTag('React')} />
*/
