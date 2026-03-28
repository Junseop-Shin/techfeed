import axios from 'axios';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';

interface ProgrammersJobPosition {
  id: number;
  title: string;
  company: { name: string };
  technicalTags: string[];
  location?: string;
}

interface ProgrammersApiResponse {
  jobPositions: ProgrammersJobPosition[];
}

const PROGRAMMERS_API_BASE = 'https://career.programmers.co.kr/api/job_positions';
const PROGRAMMERS_JOB_BASE = 'https://career.programmers.co.kr/job_positions';
const MAX_ITEMS = 100;
const PAGE_SIZE = 20;

export class ProgrammersCrawler extends BaseCrawler {
  constructor(esClient: Client, redis: Redis) {
    super(esClient, redis);
  }

  async crawl(): Promise<RawContent[]> {
    const results: RawContent[] = [];

    try {
      let page = 1;
      while (results.length < MAX_ITEMS) {
        const url = `${PROGRAMMERS_API_BASE}?order=recent&page=${page}&min_career=0`;
        const response = await axios.get<ProgrammersApiResponse>(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TechFeedBot/1.0)',
            Accept: 'application/json',
          },
          timeout: 15000,
        });

        const positions = response.data?.jobPositions ?? [];
        if (positions.length === 0) break;

        for (const pos of positions) {
          results.push({
            type: 'job' as const,
            title: `${pos.title} — ${pos.company.name}`,
            company_name: pos.company.name,
            position: pos.title,
            url: `${PROGRAMMERS_JOB_BASE}/${pos.id}`,
            summary: pos.location ?? undefined,
            tags: ['job'],
            source_name: 'Programmers',
            published_at: new Date(),
          });
        }

        if (positions.length < PAGE_SIZE) break;
        page++;
      }

      console.log(`[ProgrammersCrawler] Fetched ${results.length} jobs`);
    } catch (err) {
      console.error('[ProgrammersCrawler] Failed to fetch jobs:', err);
    }

    return results;
  }
}
