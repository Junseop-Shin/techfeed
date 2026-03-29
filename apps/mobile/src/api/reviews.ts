import { apiClient } from './client';

export interface Review {
  id: number;
  rating: number;
  body: string | null;
  created_at: string;
}

export const submitReview = (rating: number, body?: string): Promise<Review> =>
  apiClient.post('/reviews', { rating, body }).then((r) => r.data);
