import axios from 'axios';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';

interface JumpitPosition {
  id: number;
  title: string;
  companyName: string;
  techStacks: string[];
  thumbnail?: string;
}

interface JumpitApiResponse {
  result: {
    positions: JumpitPosition[];
    totalCount?: number;
  };
}

const JUMPIT_API_BASE = 'https://jumpit-api.saramin.co.kr/api/positions';
const JUMPIT_JOB_BASE = 'https://www.jumpit.co.kr/position';
const MAX_ITEMS = 100;
const PAGE_SIZE = 20; // default page size from the API

export class JumpitCrawler extends BaseCrawler {
  constructor(esClient: Client, redis: Redis) {
    super(esClient, redis);
  }

  async crawl(): Promise<RawContent[]> {
    const results: RawContent[] = [];

    try {
      let page = 1;
      while (results.length < MAX_ITEMS) {
        const url = `${JUMPIT_API_BASE}?sort=createdAt&page=${page}`;
        const response = await axios.get<JumpitApiResponse>(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TechFeedBot/1.0)',
            Accept: 'application/json',
          },
          timeout: 15000,
        });

        const positions = response.data?.result?.positions ?? [];
        if (positions.length === 0) break;

        for (const pos of positions) {
          results.push({
            type: 'job' as const,
            title: `${pos.title} — ${pos.companyName}`,
            company_name: pos.companyName,
            position: pos.title,
            url: `${JUMPIT_JOB_BASE}/${pos.id}`,
            thumbnail: pos.thumbnail ?? undefined,
            tags: ['job'],
            source_name: 'Jumpit',
            published_at: new Date(),
          });
        }

        if (positions.length < PAGE_SIZE) break;
        page++;
      }

      console.log(`[JumpitCrawler] Fetched ${results.length} jobs`);
    } catch (err) {
      console.error('[JumpitCrawler] Failed to fetch jobs:', err);
    }

    return results;
  }
}
