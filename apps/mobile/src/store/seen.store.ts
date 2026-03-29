import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type SourceType = 'blog' | 'youtube' | 'job';

const KEYS: Record<SourceType, string> = {
  blog: 'last_visit_blog',
  youtube: 'last_visit_youtube',
  job: 'last_visit_job',
};

interface SeenState {
  lastVisit: Record<SourceType, string | null>;
  loadVisits: () => Promise<void>;
  markVisited: (sourceType: SourceType) => Promise<void>;
  isNew: (sourceType: SourceType, publishedAt: string) => boolean;
}

export const useSeenStore = create<SeenState>((set, get) => ({
  lastVisit: { blog: null, youtube: null, job: null },

  async loadVisits() {
    const [blog, youtube, job] = await Promise.all([
      SecureStore.getItemAsync(KEYS.blog),
      SecureStore.getItemAsync(KEYS.youtube),
      SecureStore.getItemAsync(KEYS.job),
    ]);
    set({ lastVisit: { blog, youtube, job } });
  },

  async markVisited(sourceType) {
    const now = new Date().toISOString();
    await SecureStore.setItemAsync(KEYS[sourceType], now);
    set((s) => ({ lastVisit: { ...s.lastVisit, [sourceType]: now } }));
  },

  isNew(sourceType, publishedAt) {
    const last = get().lastVisit[sourceType];
    // First install: no visit recorded → everything is new
    if (!last) return true;
    return new Date(publishedAt) > new Date(last);
  },
}));
