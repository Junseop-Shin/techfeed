import { Queue, Worker, Job } from 'bullmq';
import { config } from './config';
import { createEsClient, createRedisClient } from './db';
import { BlogCrawler } from './crawlers/blog.crawler';
import { YouTubeCrawler } from './crawlers/youtube.crawler';
import { JobCrawler } from './crawlers/job.crawler';
import { JumpitCrawler } from './crawlers/jumpit.crawler';
import { CrawlerSourceModel } from './models/source.model';

const QUEUE_NAME = 'crawl';
const CRAWL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
  };
}

export async function startQueue(): Promise<void> {
  const esClient = createEsClient();
  const redis = createRedisClient();
  const redisConnection = parseRedisUrl(config.redisUrl);

  const queue = new Queue(QUEUE_NAME, { connection: redisConnection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      console.log(`[Queue] Running job: ${job.name}`);

      // Load sources from DB on each crawl cycle
      const dbSources = await CrawlerSourceModel.find({ enabled: true }).lean();

      const blog = new BlogCrawler(esClient, redis, dbSources as any);
      const youtube = new YouTubeCrawler(esClient, redis, dbSources as any);
      const jobs = new JobCrawler(esClient, redis);
      const jumpit = new JumpitCrawler(esClient, redis);

      await Promise.allSettled([
        blog.run(),
        youtube.run(),
        jobs.run(),
        jumpit.run(),
      ]);

      console.log('[Queue] Crawl cycle complete');
    },
    { connection: redisConnection },
  );

  worker.on('completed', (job) => {
    console.log(`[Queue] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} failed:`, err);
  });

  // Schedule repeating job every 15 minutes
  await queue.add(
    'crawl-all',
    {},
    {
      repeat: { every: CRAWL_INTERVAL_MS },
      removeOnComplete: 10,
      removeOnFail: 5,
    },
  );

  // Run immediately on startup
  await queue.add('crawl-all-initial', {}, { removeOnComplete: true });

  console.log('[Queue] Crawler queue started — interval: 15 minutes');
}
