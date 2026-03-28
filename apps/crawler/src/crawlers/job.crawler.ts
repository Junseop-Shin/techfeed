import axios from 'axios';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';
import { jobSources } from '../config';

interface WantedJob {
  id: number;
  position: string;
  company: { name: string };
  address: { location: string };
  due_time: string | null;
  tags: Array<{ id: number; kind: string; value: string }>;
}

interface WantedApiResponse {
  data: WantedJob[];
}

const WANTED_BASE_URL = 'https://www.wanted.co.kr';
// tag_type_ids=518 → 개발 직군
const WANTED_API_URL =
  'https://www.wanted.co.kr/api/v4/jobs?country=kr&job_sort=job.latest_order&years=-1&locations=all&limit=100&tag_type_ids=518';

export class JobCrawler extends BaseCrawler {
  constructor(esClient: Client, redis: Redis) {
    super(esClient, redis);
  }

  async crawl(): Promise<RawContent[]> {
    const results: RawContent[] = [];

    for (const source of jobSources) {
      try {
        let items: RawContent[] = [];
        if (source.type === 'wanted-api') {
          items = await this.fetchWantedApi(source);
        }
        results.push(...items);
        console.log(`[JobCrawler] Fetched ${items.length} jobs from ${source.name}`);
      } catch (err) {
        console.error(`[JobCrawler] Failed to fetch ${source.name}:`, err);
      }
    }

    return results;
  }

  private async fetchWantedApi(source: { name: string; tags: string[] }): Promise<RawContent[]> {
    const response = await axios.get<WantedApiResponse>(WANTED_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TechFeedBot/1.0)',
        Accept: 'application/json, text/plain, */*',
        Referer: WANTED_BASE_URL,
      },
      timeout: 15000,
    });

    const jobs = response.data?.data ?? [];
    return jobs.map((job) => ({
      type: 'job' as const,
      title: `${job.position} — ${job.company.name}`,
      company_name: job.company.name,
      position: job.position,
      url: `${WANTED_BASE_URL}/wd/${job.id}`,
      summary: job.address?.location ?? undefined,
      tags: [...source.tags],
      source_name: source.name,
      published_at: new Date(),
    }));
  }
}
