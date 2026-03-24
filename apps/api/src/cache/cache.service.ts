import { Injectable } from '@nestjs/common';
import { RedisProvider } from './redis.provider';

const TRENDING_KEY = 'rank:contents';
const TRENDING_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisProvider) {}

  async getTrending(limit: number = 20): Promise<string[]> {
    return this.redis.client.zrevrange(TRENDING_KEY, 0, limit - 1);
  }

  async incrementViewCount(contentId: string, score: number = 1): Promise<void> {
    await this.redis.client.zincrby(TRENDING_KEY, score, contentId);
  }

  async setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.redis.client.get(key);
  }
}
