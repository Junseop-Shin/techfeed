import { apiClient } from './client';
export { trackEvent } from './analytics';

export interface Content {
  id: string;
  title: string;
  url: string;
  source_type: 'blog' | 'youtube' | 'job';
  source_name: string;
  thumbnail_url?: string;
  published_at: string;
  tags: string[];
  // blog specific
  author?: string;
  // youtube specific
  channel_name?: string;
  // job specific
  company_name?: string;
  position?: string;
  // shared optional
  summary?: string;
}

export interface ContentsResponse {
  items: Content[];
  total: number;
  page: number;
  limit: number;
}

export interface ContentsParams {
  q?: string;
  tags?: string;
  source_type?: string;
  page?: number;
  limit?: number;
  sort?: 'date' | 'views' | 'likes' | 'bookmarks';
}

export const getContents = (params: ContentsParams): Promise<ContentsResponse> =>
  apiClient.get('/contents', { params }).then((r) => r.data);

export const getTrending = (): Promise<Content[]> =>
  apiClient.get('/contents/trending').then((r) => r.data);

export const getContentById = (id: string): Promise<Content> =>
  apiClient.get(`/contents/${id}`).then((r) => r.data);

export const autocomplete = (q: string): Promise<string[]> =>
  apiClient.get('/contents/autocomplete', { params: { q } }).then((r) => r.data);

export const getContentSummary = (id: string): Promise<{ summary: string }> =>
  apiClient.get(`/contents/${id}/summary`).then((r) => r.data);

export const getRecommended = (): Promise<ContentsResponse> =>
  apiClient.get('/contents/recommended').then((r) => r.data);

export const toggleLike = (contentId: string): Promise<{ liked: boolean; like_count: number }> =>
  apiClient.post(`/contents/${contentId}/like`).then((r) => r.data);

