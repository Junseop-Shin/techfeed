import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisProvider implements OnModuleInit {
  private readonly logger = new Logger(RedisProvider.name);
  public client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://localhost:3103'),
    );
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('Connected to Redis');
    } catch (err) {
      this.logger.error('Failed to connect to Redis', err);
    }
  }
}
