import axios from 'axios';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';

const REMEMBER_API_BASE = 'https://career.remember.co.kr/api/v1/job-postings';
const REMEMBER_JOB_BASE = 'https://career.remember.co.kr/jobs';
const MAX_ITEMS = 100;
const PAGE_SIZE = 20;

export class RememberCrawler extends BaseCrawler {
  constructor(esClient: Client, redis: Redis) {
    super(esClient, redis);
  }

  async crawl(): Promise<RawContent[]> {
    const results: RawContent[] = [];

    try {
      let page = 0;
      while (results.length < MAX_ITEMS) {
        const url = `${REMEMBER_API_BASE}?page=${page}&size=${PAGE_SIZE}&sortType=LATEST`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TechFeedBot/1.0)',
            Accept: 'application/json',
          },
          timeout: 15000,
        });

        const data = response.data;

        // Log response shape on first page to aid future debugging
        if (page === 0) {
          const shape = Array.isArray(data)
            ? `array[${data.length}]`
            : `object keys: ${Object.keys(data ?? {}).join(', ')}`;
          console.log(`[RememberCrawler] Response shape: ${shape}`);
        }

        // Try common envelope patterns
        const items: unknown[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.jobPostings)
                ? data.jobPostings
                : Array.isArray(data?.items)
                  ? data.items
                  : [];

        if (items.length === 0) break;

        for (const item of items) {
          const posting = item as Record<string, unknown>;
          const id = posting.id ?? posting.jobPostingId ?? posting.postingId;
          const title =
            (posting.title as string | undefined) ??
            (posting.name as string | undefined) ??
            (posting.positionName as string | undefined);

          const companyObj = posting.company as Record<string, unknown> | undefined;
          const companyName =
            (companyObj?.name as string | undefined) ??
            (posting.companyName as string | undefined) ??
            (posting.company as string | undefined);

          if (!id || !title || !companyName) {
            console.log(`[RememberCrawler] Skipping malformed item: ${JSON.stringify(posting)}`);
            continue;
          }

          results.push({
            type: 'job' as const,
            title: `${title} — ${companyName}`,
            company_name: companyName,
            position: title,
            url: `${REMEMBER_JOB_BASE}/${id}`,
            tags: ['job'],
            source_name: 'Remember',
            published_at: new Date(),
          });
        }

        if (items.length < PAGE_SIZE) break;
        page++;
      }

      console.log(`[RememberCrawler] Fetched ${results.length} jobs`);
    } catch (err) {
      console.error('[RememberCrawler] Failed to fetch jobs:', err);
    }

    return results;
  }
}
