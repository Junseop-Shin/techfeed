import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getComments, postComment } from '../api/comments';
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
  });

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
          marginBottom: 3,
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

  const visibleComments = comments?.slice(0, 5) ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>댓글 {comments ? `(${comments.length})` : ''}</Text>

      {isLoading && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
      )}

      {!isLoading && visibleComments.length === 0 && (
        <Text style={styles.emptyText}>첫 댓글을 남겨보세요.</Text>
      )}

      {visibleComments.map((comment) => (
        <View key={comment.id} style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{comment.author_name}</Text>
            <Text style={styles.commentDate}>{formatCommentDate(comment.created_at)}</Text>
          </View>
          <Text style={styles.commentBody}>{comment.body}</Text>
        </View>
      ))}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="댓글을 입력하세요..."
          placeholderTextColor={colors.textSecondary}
          multiline
          returnKeyType="default"
          accessibilityLabel="댓글 입력"
          onFocus={() => {
            if (!token) {
              setBenefitsVisible(true);
            }
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
            if (trimmed) {
              submitComment(trimmed);
            }
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
