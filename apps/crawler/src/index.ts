import 'dotenv/config';
import { connectMongo } from './db';
import { startQueue } from './queue';

async function main() {
  console.log('[TechFeed Crawler] Starting...');

  await connectMongo();
  await startQueue();

  console.log('[TechFeed Crawler] Ready');
}

main().catch((err) => {
  console.error('[TechFeed Crawler] Fatal error:', err);
  process.exit(1);
});
