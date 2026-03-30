import { apiClient } from './client';
import type { Content } from './contents';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
}

export interface BookmarkItem {
  id: number;
  content_id: string;
  content_type: string | null;
  status: string | null;
  job_status: string | null;
  created_at: string;
  content?: Content;
}

export const getBookmarks = (): Promise<BookmarkItem[]> =>
  apiClient.get('/users/me/bookmarks').then((r) => r.data);

export const addBookmark = (contentId: string): Promise<void> =>
  apiClient.post(`/users/me/bookmarks/${contentId}`).then((r) => r.data);

export const removeBookmark = (contentId: string): Promise<void> =>
  apiClient.delete(`/users/me/bookmarks/${contentId}`).then((r) => r.data);

export const addBookmarkWithType = (contentId: string, contentType: string, status?: string): Promise<void> =>
  apiClient.post(`/users/me/bookmarks/${contentId}`, { content_type: contentType, status }).then((r) => r.data);

export const updateBookmarkStatus = (contentId: string, status: string): Promise<void> =>
  apiClient.patch(`/users/me/bookmarks/${contentId}/status`, { status }).then((r) => r.data);

export const updateBookmarkJobStatus = (contentId: string, status: string): Promise<void> =>
  apiClient.patch(`/users/me/bookmarks/${contentId}/job-status`, { status }).then((r) => r.data);

export const getBookmarksByType = (contentType: string): Promise<BookmarkItem[]> =>
  apiClient.get('/users/me/bookmarks', { params: { content_type: contentType } }).then((r) => r.data);

export const getProfile = (): Promise<UserProfile> =>
  apiClient.get('/users/me').then((r) => r.data);

export const updateTags = (tags: string[]): Promise<UserProfile> =>
  apiClient.put('/users/me/tags', { tags }).then((r) => r.data);

export const subscribePush = (token: string): Promise<void> =>
  apiClient.post('/push/subscribe', { fcm_token: token }).then((r) => r.data);

export const removePushToken = (): Promise<void> =>
  apiClient.delete('/users/me/fcm-token').then((r) => r.data);

export interface UserStats {
  week_reads: number;
  total_reads: number;
  tag_distribution: { tag: string; count: number; percentage: number }[];
  streak_days: number;
}

export interface UserPreferences {
  channels: string[];
  subjects: string[];
}

export const getUserStats = (): Promise<UserStats> =>
  apiClient.get('/users/me/stats').then((r) => r.data);

export const getUserPreferences = (): Promise<UserPreferences> =>
  apiClient.get('/users/me/preferences').then((r) => r.data);

export const updateUserPreferences = (prefs: Partial<UserPreferences>): Promise<void> =>
  apiClient.patch('/users/me/preferences', prefs).then((r) => r.data);

export const getAvailableTags = (): Promise<string[]> =>
  apiClient.get('/tags').then((r) => r.data.tags);

export const getBadge = (): Promise<{ count: number }> =>
  apiClient.get('/users/me/badge').then((r) => r.data);

export const resetBadge = (): Promise<void> =>
  apiClient.post('/users/me/badge/reset').then((r) => r.data);

export const updateName = (name: string): Promise<void> =>
  apiClient.patch('/users/me/name', { name }).then((r) => r.data);

export const deleteAccount = (password?: string): Promise<void> =>
  apiClient.delete('/users/me', { data: password ? { password } : {} }).then((r) => r.data);
