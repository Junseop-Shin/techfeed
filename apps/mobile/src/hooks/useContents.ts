import { useQuery } from '@tanstack/react-query';
import {
  getContents,
  getTrending,
  getContentById,
  autocomplete,
  getRecommended,
  type ContentsParams,
} from '../api/contents';

export const useContents = (params: ContentsParams) =>
  useQuery({
    queryKey: ['contents', params],
    queryFn: () => getContents(params),
  });

export const useTrending = () =>
  useQuery({
    queryKey: ['contents', 'trending'],
    queryFn: getTrending,
  });

export const useContentById = (id: string) =>
  useQuery({
    queryKey: ['contents', id],
    queryFn: () => getContentById(id),
    enabled: !!id,
  });

export const useAutocomplete = (q: string) =>
  useQuery({
    queryKey: ['autocomplete', q],
    queryFn: () => autocomplete(q),
    enabled: q.length > 0,
  });

export const useRecommended = () =>
  useQuery({ queryKey: ['contents', 'recommended'], queryFn: getRecommended });
