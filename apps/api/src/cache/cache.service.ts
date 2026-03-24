import { Injectable } from '@nestjs/common';
import { RedisProvider } from './redis.provider';

const TRENDING_KEY = 'rank:contents';
const FEED_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisProvider) {}

  // --- Trending (Sorted Set) ---

  async getTrending(limit: number = 20): Promise<string[]> {
    return this.redis.client.zrevrange(TRENDING_KEY, 0, limit - 1);
  }

  /**
   * 조회 시 점수 증가 + 시간 감쇠 적용.
   * score = currentScore * 0.99 + increment
   * 오래된 콘텐츠는 자연스럽게 랭킹에서 밀려남.
   */
  async incrementViewCount(contentId: string): Promise<void> {
    const current = await this.redis.client.zscore(TRENDING_KEY, contentId);
    const decayed = current ? parseFloat(current) * 0.99 : 0;
    await this.redis.client.zadd(TRENDING_KEY, decayed + 1, contentId);
  }

  /**
   * 새 콘텐츠 등록 시 초기 점수 부여 (최신성 반영).
   * score = 현재 유닉스 타임스탬프 기반 (최신이 높음)
   */
  async addNewContent(contentId: string): Promise<void> {
    const initialScore = Date.now() / 1000; // seconds
    await this.redis.client.zadd(TRENDING_KEY, 'NX', initialScore, contentId);
  }

  // --- Feed Cache ---

  async getFeedCache(key: string): Promise<string | null> {
    return this.redis.client.get(`feed:${key}`);
  }

  async setFeedCache(key: string, value: string): Promise<void> {
    await this.redis.client.set(`feed:${key}`, value, 'EX', FEED_TTL_SECONDS);
  }

  async invalidateFeedCache(sourceType?: string): Promise<void> {
    const keys = sourceType
      ? [`feed:${sourceType}`]
      : ['feed:main', 'feed:blog', 'feed:youtube', 'feed:job'];
    if (keys.length > 0) {
      await this.redis.client.del(...keys);
    }
  }
}
