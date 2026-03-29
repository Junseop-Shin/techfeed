import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getComments, postComment, deleteComment } from '../api/comments';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { AuthBenefitsSheet } from './AuthBenefitsSheet';

function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

interface CommentSectionProps {
  contentId: string;
}

export function CommentSection({ contentId }: CommentSectionProps) {
  const colors = useThemeStore((s) => s.colors);
  const token = useAuthStore((s) => s.token);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [benefitsVisible, setBenefitsVisible] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', contentId],
    queryFn: () => getComments(contentId),
  });

  const { mutate: submitComment, isPending: isSubmitting } = useMutation({
    mutationFn: (body: string) => postComment(contentId, body),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', contentId] });
    },
    onError: () => {
      Alert.alert('오류', '댓글 등록에 실패했습니다.');
    },
  });

  const { mutate: removeComment } = useMutation({
    mutationFn: (commentId: number) => deleteComment(contentId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', contentId] });
    },
    onError: () => {
      Alert.alert('오류', '댓글 삭제에 실패했습니다.');
    },
  });

  const handleDeleteComment = (commentId: number) => {
    Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeComment(commentId) },
    ]);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginTop: 12,
          backgroundColor: colors.surfaceHigh,
          borderRadius: 8,
          padding: 12,
        },
        sectionTitle: {
          fontSize: 13,
          fontWeight: '600' as const,
          color: colors.textPrimary,
          marginBottom: 10,
        },
        commentItem: {
          marginBottom: 10,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        commentHeader: {
          flexDirection: 'row' as const,
          justifyContent: 'space-between' as const,
          alignItems: 'center' as const,
          marginBottom: 3,
        },
        commentMeta: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: 6,
        },
        commentAuthor: {
          fontSize: 12,
          fontWeight: '600' as const,
          color: colors.textPrimary,
        },
        commentDate: {
          fontSize: 11,
          color: colors.textTertiary,
        },
        commentBody: {
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 18,
        },
        deleteBtn: {
          paddingHorizontal: 6,
          paddingVertical: 2,
        },
        deleteBtnText: {
          fontSize: 11,
          color: colors.danger ?? '#EF4444',
        },
        inputRow: {
          flexDirection: 'row' as const,
          marginTop: 8,
        },
        input: {
          flex: 1,
          backgroundColor: colors.searchBg,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 13,
          color: colors.textPrimary,
          minHeight: 36,
          marginRight: 8,
        },
        submitButton: {
          backgroundColor: colors.primary,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
        submitButtonText: {
          fontSize: 13,
          fontWeight: '600' as const,
          color: '#FFFFFF',
        },
        emptyText: {
          fontSize: 12,
          color: colors.textTertiary,
          textAlign: 'center' as const,
          paddingVertical: 8,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>댓글 {comments ? `(${comments.length})` : ''}</Text>

      {isLoading && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
      )}

      {!isLoading && comments?.length === 0 && (
        <Text style={styles.emptyText}>첫 댓글을 남겨보세요.</Text>
      )}

      {comments?.map((comment) => (
        <View key={comment.id} style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <View style={styles.commentMeta}>
              <Text style={styles.commentAuthor}>{comment.user.name}</Text>
              <Text style={styles.commentDate}>{formatCommentDate(comment.created_at)}</Text>
            </View>
            {currentUserId === comment.user.id && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteComment(comment.id)}
                accessibilityRole="button"
                accessibilityLabel="댓글 삭제"
              >
                <Text style={styles.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentBody}>{comment.body}</Text>
        </View>
      ))}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={commentText}
          onChangeText={setCommentText}
          placeholder={token ? '댓글을 입력하세요...' : '로그인 후 댓글을 남길 수 있습니다'}
          placeholderTextColor={colors.textSecondary}
          multiline
          returnKeyType="default"
          accessibilityLabel="댓글 입력"
          onFocus={() => {
            if (!token) setBenefitsVisible(true);
          }}
          editable={!!token}
        />
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            if (!token) {
              setBenefitsVisible(true);
              return;
            }
            const trimmed = commentText.trim();
            if (trimmed) submitComment(trimmed);
          }}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="댓글 등록"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>등록</Text>
          )}
        </TouchableOpacity>
      </View>

      <AuthBenefitsSheet
        visible={benefitsVisible}
        onClose={() => setBenefitsVisible(false)}
        onSignIn={() => {
          setBenefitsVisible(false);
          router.push('/auth/login');
        }}
      />
    </View>
  );
}
