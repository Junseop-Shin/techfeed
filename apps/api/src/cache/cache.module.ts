import { Module } from '@nestjs/common';
import { RedisProvider } from './redis.provider';
import { CacheService } from './cache.service';

@Module({
  providers: [RedisProvider, CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
