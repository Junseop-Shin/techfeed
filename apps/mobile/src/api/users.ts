import { apiClient } from './client';
import type { Content } from './contents';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
}

export const getBookmarks = (): Promise<Content[]> =>
  apiClient.get('/users/me/bookmarks').then((r) => r.data);

export const addBookmark = (contentId: string): Promise<void> =>
  apiClient.post(`/users/me/bookmarks/${contentId}`).then((r) => r.data);

export const removeBookmark = (contentId: string): Promise<void> =>
  apiClient.delete(`/users/me/bookmarks/${contentId}`).then((r) => r.data);

export const getProfile = (): Promise<UserProfile> =>
  apiClient.get('/users/me').then((r) => r.data);

export const updateTags = (tags: string[]): Promise<UserProfile> =>
  apiClient.put('/users/me/tags', { tags }).then((r) => r.data);

export const subscribePush = (token: string): Promise<void> =>
  apiClient.post('/push/subscribe', { token }).then((r) => r.data);

export const removePushToken = (): Promise<void> =>
  apiClient.delete('/users/me/fcm-token').then((r) => r.data);
