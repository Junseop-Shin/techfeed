import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useThemeStore } from '../store/theme.store';
import { useAuthStore } from '../store/auth.store';

interface SummaryLimitSheetProps {
  visible: boolean;
  contentType: string;
  currentLimit: number;
  upgradeLimit: number | null;
  onClose: () => void;
  onSignUp: () => void;
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  blog: '블로그',
  youtube: '영상',
  job: '채용공고',
};

export function SummaryLimitSheet({
  visible,
  contentType,
  currentLimit,
  upgradeLimit,
  onClose,
  onSignUp,
}: SummaryLimitSheetProps) {
  const colors = useThemeStore((s) => s.colors);
  const token = useAuthStore((s) => s.token);
  const typeLabel = CONTENT_TYPE_LABEL[contentType] ?? contentType;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 24,
          paddingBottom: 36,
          paddingTop: 16,
        },
        handle: {
          width: 36,
          height: 4,
          backgroundColor: colors.border,
          borderRadius: 2,
          alignSelf: 'center' as const,
          marginBottom: 20,
        },
        icon: {
          fontSize: 40,
          textAlign: 'center' as const,
          marginBottom: 12,
        },
        title: {
          fontSize: 17,
          fontWeight: '700' as const,
          color: colors.textPrimary,
          textAlign: 'center' as const,
          lineHeight: 24,
          marginBottom: 10,
        },
        desc: {
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center' as const,
          lineHeight: 20,
          marginBottom: 20,
        },
        quotaRow: {
          flexDirection: 'row' as const,
          justifyContent: 'center' as const,
          gap: 24,
          marginBottom: 24,
          backgroundColor: colors.searchBg,
          borderRadius: 12,
          paddingVertical: 14,
        },
        quotaItem: { alignItems: 'center' as const },
        quotaLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
        quotaValue: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
        quotaUnit: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        arrow: { fontSize: 20, color: colors.textTertiary, alignSelf: 'center' as const },
        primaryBtn: {
          backgroundColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center' as const,
          marginBottom: 10,
        },
        primaryBtnText: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF' },
        laterBtn: { alignItems: 'center' as const, paddingVertical: 10 },
        laterBtnText: { fontSize: 14, color: colors.textSecondary },
      }),
    [colors]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="닫기">
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.icon}>🤖</Text>
          <Text style={styles.title}>
            {typeLabel} AI 요약 일일 할당량을{'\n'}모두 소진했습니다
          </Text>
          <Text style={styles.desc}>
            {token
              ? '내일 다시 이용하시거나 프리미엄으로 업그레이드하세요.'
              : '회원가입하면 더 많은 AI 요약을 이용할 수 있어요.'}
          </Text>

          {!token && upgradeLimit != null && (
            <View style={styles.quotaRow}>
              <View style={styles.quotaItem}>
                <Text style={styles.quotaLabel}>현재</Text>
                <Text style={styles.quotaValue}>{currentLimit}</Text>
                <Text style={styles.quotaUnit}>회/일</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.quotaItem}>
                <Text style={styles.quotaLabel}>회원가입 후</Text>
                <Text style={[styles.quotaValue, { color: colors.primary }]}>{upgradeLimit}</Text>
                <Text style={styles.quotaUnit}>회/일</Text>
              </View>
            </View>
          )}

          {!token ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={onSignUp} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>회원가입하러 가기</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.laterBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.laterBtnText}>닫기</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
