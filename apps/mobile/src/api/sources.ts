import { apiClient } from './client';

export interface Source {
  _id: string;
  name: string;
  type: 'blog' | 'youtube' | 'job';
  tags: string[];
  enabled: boolean;
}

export interface UserSourceItem {
  id: number;
  source_id: string;
  source_type: string;
}

export const getSources = (type?: string): Promise<Source[]> =>
  apiClient.get('/sources', { params: type ? { type } : {} }).then((r) => r.data);

export const getUserSources = (): Promise<UserSourceItem[]> =>
  apiClient.get('/users/me/sources').then((r) => r.data);

export const followSource = (sourceId: string, sourceType: string): Promise<void> =>
  apiClient.post(`/users/me/sources/${sourceId}`, { source_type: sourceType }).then((r) => r.data);

export const unfollowSource = (sourceId: string): Promise<void> =>
  apiClient.delete(`/users/me/sources/${sourceId}`).then((r) => r.data);
