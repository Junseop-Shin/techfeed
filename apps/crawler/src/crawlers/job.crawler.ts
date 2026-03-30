import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';
import { JobDetail } from '../models/content.model';
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

// Wanted 도메인 allowlist — SSRF 방지
const ALLOWED_DETAIL_DOMAIN = 'www.wanted.co.kr';

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === ALLOWED_DETAIL_DOMAIN && parsed.pathname.startsWith('/wd/');
  } catch {
    return false;
  }
}

async function fetchJobDetail(url: string): Promise<JobDetail | null> {
  if (!isAllowedUrl(url)) return null;

  try {
    const response = await axios.get<string>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TechFeedBot/1.0)',
        Accept: 'text/html',
        Referer: WANTED_BASE_URL,
      },
      timeout: 10000,
      responseType: 'text',
    });

    const $ = cheerio.load(response.data);

    const detail: JobDetail = {};

    // Wanted 상세 페이지 구조: 각 섹션은 <div class="JobDescription_..."> 아래
    // 섹션 헤더 텍스트로 파싱
    const sections: Record<string, string[]> = {};
    let currentSection = '';

    $('p, h2, h3, li, span').each((_i, el) => {
      const tag = el.type === 'tag' ? el.name : '';
      const text = $(el).text().trim();
      if (!text) return;

      if (tag === 'h2' || tag === 'h3') {
        currentSection = text;
        if (!sections[currentSection]) sections[currentSection] = [];
      } else if (currentSection) {
        sections[currentSection].push(text);
      }
    });

    // 섹션 매핑
    for (const [sectionTitle, lines] of Object.entries(sections)) {
      const normalized = sectionTitle.replace(/\s/g, '').toLowerCase();
      if (normalized.includes('주요업무') || normalized.includes('담당업무')) {
        detail.description = lines.join('\n');
      } else if (normalized.includes('자격요건') || normalized.includes('필수')) {
        detail.requirements = lines;
      } else if (normalized.includes('우대') || normalized.includes('우대사항')) {
        detail.preferred = lines;
      } else if (normalized.includes('복리후생') || normalized.includes('혜택')) {
        detail.benefits = lines;
      }
    }

    // 최소 하나라도 채워졌으면 반환
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

    // 5개 동시 처리, 요청 사이 200ms 간격 (100개 기준 약 4초)
    const limit = pLimit(5);

    const results = await Promise.all(
      jobs.map((job) =>
        limit(async () => {
          const jobUrl = `${WANTED_BASE_URL}/wd/${job.id}`;
          const job_detail = await fetchJobDetail(jobUrl);
          await sleep(200);
          return {
            type: 'job' as const,
            title: `${job.position} — ${job.company.name}`,
            company_name: job.company.name,
            position: job.position,
            url: jobUrl,
            summary: job.address?.location ?? undefined,
            tags: [...source.tags],
            source_name: source.name,
            published_at: new Date(),
            ...(job_detail && { job_detail }),
          } satisfies RawContent;
        }),
      ),
    );

    return results;
  }
}
