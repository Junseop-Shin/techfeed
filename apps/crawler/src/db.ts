import mongoose from 'mongoose';
import { Client } from '@elastic/elasticsearch';
import { config } from './config';

export let esClient: Client;

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
  console.log('[db] MongoDB connected');
}

export function createEsClient(): Client {
  esClient = new Client({ node: config.elasticsearchUrl });
  return esClient;
}
