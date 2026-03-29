import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  getBookmarksByType,
  updateBookmarkStatus,
  updateBookmarkJobStatus,
} from '../api/users';
import type { BookmarkItem } from '../api/users';
import { useAuthStore } from '../store/auth.store';

export const useBookmarks = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    enabled: !!token,
    select: (data) => new Set(data.map((c) => c.content_id)),
  });
};

export const useBookmarkStatus = (contentId: string) => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    enabled: !!token,
    select: (data) => data.find((c) => c.content_id === contentId)?.status ?? null,
  });
};

export const useToggleBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, isBookmarked }: { contentId: string; isBookmarked: boolean }) =>
      isBookmarked ? removeBookmark(contentId) : addBookmark(contentId),
    onMutate: async ({ contentId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ['bookmarks'] });
      const previous = queryClient.getQueryData(['bookmarks']);

      queryClient.setQueryData(['bookmarks'], (old: BookmarkItem[] | undefined) => {
        if (!old) return old;
        return isBookmarked
          ? old.filter((c) => c.content_id !== contentId)
          : [...old, { id: 0, content_id: contentId, content_type: null, status: null, created_at: new Date().toISOString() }];
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['bookmarks'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
};

export const useBookmarksByType = (contentType: string) => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['bookmarks', 'byType', contentType],
    queryFn: () => getBookmarksByType(contentType),
    enabled: !!token,
  });
};

export const useUpdateBookmarkStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, status }: { contentId: string; status: string }) =>
      updateBookmarkStatus(contentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', 'byType'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
};

export const useBookmarkJobStatus = (contentId: string) => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    enabled: !!token,
    select: (data) => data.find((c) => c.content_id === contentId)?.job_status ?? null,
  });
};

export const useUpdateBookmarkJobStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, status }: { contentId: string; status: string }) =>
      updateBookmarkJobStatus(contentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', 'byType'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
};
