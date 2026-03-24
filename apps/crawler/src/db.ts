import mongoose from 'mongoose';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { config } from './config';

export let esClient: Client;
export let redisClient: Redis;

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
  console.log('[db] MongoDB connected');
}

export function createEsClient(): Client {
  esClient = new Client({ node: config.elasticsearchUrl });
  return esClient;
}

export function createRedisClient(): Redis {
  redisClient = new Redis(config.redisUrl);
  return redisClient;
}
