import { apiClient } from './client';

export interface Comment {
  id: number;
  body: string;
  created_at: string;
  user: { id: string; name: string };
}

export const getComments = (contentId: string): Promise<Comment[]> =>
  apiClient.get(`/contents/${contentId}/comments`).then((r) => r.data);

export const postComment = (contentId: string, body: string): Promise<Comment> =>
  apiClient.post(`/contents/${contentId}/comments`, { body }).then((r) => r.data);

export const deleteComment = (contentId: string, commentId: number): Promise<void> =>
  apiClient.delete(`/contents/${contentId}/comments/${commentId}`).then((r) => r.data);
