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
  created_at: string;
  content?: Content;
}

export const getBookmarks = (): Promise<Content[]> =>
  apiClient.get('/users/me/bookmarks').then((r) => r.data);

export const addBookmark = (contentId: string): Promise<void> =>
  apiClient.post(`/users/me/bookmarks/${contentId}`).then((r) => r.data);

export const removeBookmark = (contentId: string): Promise<void> =>
  apiClient.delete(`/users/me/bookmarks/${contentId}`).then((r) => r.data);

export const addBookmarkWithType = (contentId: string, contentType: string): Promise<void> =>
  apiClient.post(`/users/me/bookmarks/${contentId}`, { content_type: contentType }).then((r) => r.data);

export const updateBookmarkStatus = (contentId: string, status: string): Promise<void> =>
  apiClient.patch(`/users/me/bookmarks/${contentId}/status`, { status }).then((r) => r.data);

export const getBookmarksByType = (contentType: string): Promise<BookmarkItem[]> =>
  apiClient.get('/users/me/bookmarks', { params: { content_type: contentType } }).then((r) => r.data);

export const getProfile = (): Promise<UserProfile> =>
  apiClient.get('/users/me').then((r) => r.data);

export const updateTags = (tags: string[]): Promise<UserProfile> =>
  apiClient.put('/users/me/tags', { tags }).then((r) => r.data);

export const subscribePush = (token: string): Promise<void> =>
  apiClient.post('/push/subscribe', { token }).then((r) => r.data);

export const removePushToken = (): Promise<void> =>
  apiClient.delete('/users/me/fcm-token').then((r) => r.data);
