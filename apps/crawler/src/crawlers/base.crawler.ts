import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { ContentModel, hashUrl, IContent } from '../models/content.model';
import { keywordTagMap } from '../config';

const ES_INDEX = 'contents';
const TRENDING_KEY = 'rank:contents';

export interface RawContent {
  type: 'blog' | 'youtube' | 'job';
  title: string;
  url: string;
  summary?: string;
  content_body?: string;
  thumbnail?: string;
  tags: string[];
  source_name: string;
  published_at: Date;
  company_name?: string;
  position?: string;
}

export abstract class BaseCrawler {
  constructor(
    protected readonly esClient: Client,
    protected readonly redis: Redis,
  ) {}

  abstract crawl(): Promise<RawContent[]>;

  async run(): Promise<void> {
    const items = await this.crawl();
    console.log(`[${this.constructor.name}] Fetched ${items.length} items`);

    for (const item of items) {
      await this.saveIfNew(item);
    }
  }

  private extractKeywordTags(title: string, summary?: string): string[] {
    const text = `${title} ${summary ?? ''}`.toLowerCase();
    const extracted: string[] = [];

    for (const [tag, keywords] of Object.entries(keywordTagMap)) {
      if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
        extracted.push(tag);
      }
    }

    return extracted;
  }

  private async saveIfNew(raw: RawContent): Promise<void> {
    const url_hash = hashUrl(raw.url);

    const existing = await ContentModel.findOne({ url_hash }).lean();
    if (existing) return;

    // Cross-platform job dedup by company + position
    let position_hash: string | undefined;
    if (raw.type === 'job' && raw.company_name && raw.position) {
      position_hash = hashUrl(
        raw.company_name.trim().toLowerCase() + '|' + raw.position.trim().toLowerCase(),
      );
      const dupJob = await ContentModel.findOne({ position_hash }).lean();
      if (dupJob) {
        console.log(
          `[${this.constructor.name}] Duplicate job skipped: ${raw.company_name} - ${raw.position}`,
        );
        return;
      }
    }

    const keywordTags = this.extractKeywordTags(raw.title, raw.summary);
    const tags = Array.from(new Set([...raw.tags, ...keywordTags]));

    const doc: Omit<IContent, 'created_at'> = {
      ...raw,
      url_hash,
      tags,
      es_indexed: false,
      ...(position_hash !== undefined && { position_hash }),
    };

    const saved = await ContentModel.create(doc);
    console.log(`[${this.constructor.name}] Saved: ${raw.title}`);

    await this.indexToEs(String(saved._id), saved.toObject() as IContent);
    await ContentModel.findByIdAndUpdate(saved._id, { es_indexed: true });

    // 새 콘텐츠 Redis 랭킹에 최신성 점수로 등록
    const initialScore = Date.now() / 1000;
    await this.redis.zadd(TRENDING_KEY, 'NX', initialScore, String(saved._id));

    // 새 콘텐츠 알림 발행
    await this.redis.publish(
      'new_content',
      JSON.stringify({ contentId: String(saved._id), title: raw.title, tags, source_type: raw.type }),
    );
  }

  private async indexToEs(id: string, content: IContent): Promise<void> {
    try {
      await this.esClient.index({
        index: ES_INDEX,
        id,
        document: {
          title: content.title,
          summary: content.summary,
          url: content.url,
          source_type: content.type,
          source_name: content.source_name,
          tags: content.tags,
          thumbnail: content.thumbnail,
          published_at: content.published_at,
          view_count: 0,
        },
      });
      console.log(`[${this.constructor.name}] ES indexed: ${id}`);
    } catch (err) {
      console.error(`[${this.constructor.name}] ES index failed for ${id}:`, err);
    }
  }
}
