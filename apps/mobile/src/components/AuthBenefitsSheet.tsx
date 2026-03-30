import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/theme.store';

interface AuthBenefitsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: '🤖',
    title: 'AI 요약 확대',
    description: '블로그 하루 10회 · 영상/채용 하루 3회 (비로그인 대비 3~10배)',
  },
  {
    icon: '🔖',
    title: '북마크 확대',
    description: '블로그 50개 · 영상 30개 · 채용공고 30개 저장 가능',
  },
  {
    icon: '📊',
    title: '맞춤 추천 피드',
    description: '관심 주제/채널 기반 콘텐츠 큐레이션',
  },
  {
    icon: '🔔',
    title: '새 글 알림',
    description: '구독 채널/회사에 새 글/공고 올라오면 즉시 푸시',
  },
  {
    icon: '⏰',
    title: '채용공고 마감 알림',
    description: '북마크한 공고 D-3, D-1 자동 리마인드',
  },
  {
    icon: '💬',
    title: '댓글',
    description: '글에 의견 남기기, 다른 개발자와 소통',
  },
  {
    icon: '☁️',
    title: '북마크 동기화',
    description: '기기를 바꿔도 북마크/읽기 상태 유지',
  },
];

export function AuthBenefitsSheet({ visible, onClose, onSignIn }: AuthBenefitsSheetProps) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

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
          paddingBottom: Math.max(insets.bottom, 16) + 20,
          maxHeight: '85%',
        },
        handle: {
          width: 36,
          height: 4,
          backgroundColor: colors.border,
          borderRadius: 2,
          alignSelf: 'center',
          marginTop: 12,
          marginBottom: 4,
        },
        scrollContent: {
          paddingHorizontal: 24,
          paddingBottom: 8,
        },
        titleRow: {
          paddingTop: 20,
          paddingBottom: 20,
        },
        title: {
          fontSize: 18,
          fontWeight: '700' as const,
          color: colors.textPrimary,
          lineHeight: 26,
          textAlign: 'center' as const,
        },
        benefitItem: {
          flexDirection: 'row' as const,
          alignItems: 'flex-start' as const,
          paddingVertical: 10,
          gap: 14,
        },
        benefitIcon: {
          fontSize: 22,
          width: 28,
          textAlign: 'center' as const,
          marginTop: 1,
        },
        benefitText: {
          flex: 1,
        },
        benefitTitle: {
          fontSize: 14,
          fontWeight: '600' as const,
          color: colors.textPrimary,
          marginBottom: 2,
        },
        benefitDescription: {
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 18,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border,
          marginHorizontal: 24,
          marginBottom: 4,
        },
        actions: {
          paddingHorizontal: 24,
          paddingTop: 16,
          gap: 10,
        },
        signInButton: {
          backgroundColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center' as const,
        },
        signInButtonText: {
          fontSize: 15,
          fontWeight: '600' as const,
          color: '#FFFFFF',
        },
        laterButton: {
          alignItems: 'center' as const,
          paddingVertical: 10,
        },
        laterButtonText: {
          fontSize: 14,
          color: colors.textSecondary,
          fontWeight: '500' as const,
        },
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
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="시트 닫기">
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title}>
                {'🔐 로그인하면 더 많은 기능을\n이용할 수 있어요'}
              </Text>
            </View>

            {BENEFITS.map((benefit) => (
              <View key={benefit.title} style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={onSignIn}
              accessibilityRole="button"
              accessibilityLabel="Google로 로그인"
            >
              <Text style={styles.signInButtonText}>Google로 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="나중에"
            >
              <Text style={styles.laterButtonText}>나중에</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/*
Usage example:
<AuthBenefitsSheet
  visible={sheetVisible}
  onClose={() => setSheetVisible(false)}
  onSignIn={() => {
    setSheetVisible(false);
    router.push('/auth/login');
  }}
/>
*/
