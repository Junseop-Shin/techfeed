import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';
import { JobDetail } from '../models/content.model';

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

// Jumpit 도메인 allowlist — SSRF 방지
const ALLOWED_DETAIL_DOMAIN = 'www.jumpit.co.kr';

export function isAllowedJumpitUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === ALLOWED_DETAIL_DOMAIN && parsed.pathname.startsWith('/position/');
  } catch {
    return false;
  }
}

async function fetchJumpitDetail(url: string): Promise<JobDetail | null> {
  if (!isAllowedJumpitUrl(url)) return null;

  try {
    const response = await axios.get<string>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TechFeedBot/1.0)',
        Accept: 'text/html',
        Referer: JUMPIT_JOB_BASE,
      },
      timeout: 10000,
      responseType: 'text',
    });

    const $ = cheerio.load(response.data);
    const detail: JobDetail = {};

    // Jumpit 구조: <dl> 안에 <dt>(섹션 제목) + <dd><pre>(내용)
    $('dl').each((_i, dl) => {
      const header = $(dl).find('dt').first().text().trim();
      const content = $(dl).find('dd pre').first().text().trim();
      if (!header || !content) return;

      const normalized = header.replace(/\s/g, '').toLowerCase();
      if (normalized.includes('주요업무') || normalized.includes('담당업무')) {
        detail.description = content;
      } else if (normalized.includes('자격요건') || normalized.includes('필수')) {
        detail.requirements = content.split('\n').map((l) => l.trim()).filter(Boolean);
      } else if (normalized.includes('우대') || normalized.includes('우대사항')) {
        detail.preferred = content.split('\n').map((l) => l.trim()).filter(Boolean);
      } else if (normalized.includes('복지') || normalized.includes('혜택') || normalized.includes('복리후생')) {
        detail.benefits = content.split('\n').map((l) => l.trim()).filter(Boolean);
      }
    });

    if (detail.description || (detail.requirements && detail.requirements.length > 0)) {
      return detail;
    }
    return null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class JumpitCrawler extends BaseCrawler {
  constructor(esClient: Client, redis: Redis) {
    super(esClient, redis);
  }

  async crawl(): Promise<RawContent[]> {
    const positions: JumpitPosition[] = [];

    try {
      let page = 1;
      while (positions.length < MAX_ITEMS) {
        const url = `${JUMPIT_API_BASE}?sort=createdAt&page=${page}`;
        const response = await axios.get<JumpitApiResponse>(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TechFeedBot/1.0)',
            Accept: 'application/json',
          },
          timeout: 15000,
        });

        const batch = response.data?.result?.positions ?? [];
        if (batch.length === 0) break;
        positions.push(...batch);

        if (batch.length < PAGE_SIZE) break;
        page++;
      }

      console.log(`[JumpitCrawler] Fetched ${positions.length} positions from API`);
    } catch (err) {
      console.error('[JumpitCrawler] Failed to fetch jobs:', err);
      return [];
    }

    // 5개 동시 처리, 요청 사이 200ms 간격
    const limit = pLimit(5);

    const results = await Promise.all(
      positions.map((pos) =>
        limit(async () => {
          const jobUrl = `${JUMPIT_JOB_BASE}/${pos.id}`;
          const job_detail = await fetchJumpitDetail(jobUrl);
          await sleep(200);
          return {
            type: 'job' as const,
            title: `${pos.title} — ${pos.companyName}`,
            company_name: pos.companyName,
            position: pos.title,
            url: jobUrl,
            thumbnail: pos.thumbnail ?? undefined,
            tags: ['job'],
            source_name: 'Jumpit',
            published_at: new Date(),
            ...(job_detail && { job_detail }),
          } satisfies RawContent;
        }),
      ),
    );

    console.log(`[JumpitCrawler] Saved ${results.length} jobs`);
    return results;
  }
}
