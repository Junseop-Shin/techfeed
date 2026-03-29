import * as crypto from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { InjectDataSource } from '@nestjs/typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Model } from 'mongoose';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Content, ContentDocument } from './content.schema';
import { SearchService, SearchContentsOptions } from '../search/search.service';
import { CacheService } from '../cache/cache.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const SUMMARY_CACHE_TTL = 60 * 60 * 24 * 7; // 7일

@Injectable()
export class ContentsService {
  private readonly gemini: GoogleGenerativeAI | null;
  private readonly logger = new Logger(ContentsService.name);

  constructor(
    @InjectModel(Content.name) private readonly contentModel: Model<ContentDocument>,
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.gemini = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async search(opts: SearchContentsOptions & { sort?: string }) {
    const cacheKey = 'search:' + crypto.createHash('md5').update(JSON.stringify(opts)).digest('hex');
    const cached = await this.cacheService.getFeedCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.searchService.searchContents(opts);

    if (opts.sort === 'likes' || opts.sort === 'bookmarks') {
      const ids = result.items.map((i: any) => i.id as string);
      const table = opts.sort === 'likes' ? 'likes' : 'bookmarks';
      const rows = await this.dataSource.query<{ content_id: string; count: string }[]>(
        `SELECT content_id, COUNT(*) as count FROM ${table} WHERE content_id = ANY($1) GROUP BY content_id`,
        [ids],
      );
      const countMap = new Map(rows.map((r) => [r.content_id, parseInt(r.count, 10)]));
      result.items.sort((a: any, b: any) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0));
      return result;
    }

    await this.cacheService.setFeedCache(cacheKey, JSON.stringify(result));
    return result;
  }

  @Cron('0 2 * * *')
  async cleanupOldContent(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldContents = await this.contentModel
      .find({ published_at: { $lt: cutoff } }, { _id: 1 })
      .lean()
      .exec();

    if (oldContents.length === 0) return;

    const ids = oldContents.map((c) => String(c._id));

    const [bookmarked, commented] = await Promise.all([
      this.dataSource.query<{ content_id: string }[]>(
        `SELECT DISTINCT content_id FROM bookmarks WHERE content_id = ANY($1)`, [ids],
      ),
      this.dataSource.query<{ content_id: string }[]>(
        `SELECT DISTINCT content_id FROM comments WHERE content_id = ANY($1)`, [ids],
      ),
    ]);

    const protected_ = new Set([
      ...bookmarked.map((r) => r.content_id),
      ...commented.map((r) => r.content_id),
    ]);

    const toDelete = ids.filter((id) => !protected_.has(id));
    if (toDelete.length === 0) return;

    await this.contentModel.deleteMany({ _id: { $in: toDelete } });
    this.logger.log(`Cleanup: deleted ${toDelete.length} old contents without engagement`);
  }

  async getTrending() {
    const cached = await this.cacheService.getFeedCache('content:trending');
    if (cached) return JSON.parse(cached);

    const ids = await this.cacheService.getTrending(20);
    if (ids.length === 0) return [];

    const contents = await this.contentModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec();

    const contentMap = new Map(contents.map((c) => [String(c._id), c]));
    const result = ids.map((id) => contentMap.get(id)).filter(Boolean);

    await this.cacheService.setFeedCache('content:trending', JSON.stringify(result));
    return result;
  }

  async findById(id: string) {
    const content = await this.contentModel.findById(id).lean().exec();
    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    await this.cacheService.incrementViewCount(id);

    return content;
  }

  async autocomplete(q: string) {
    return this.searchService.autocomplete(q);
  }

  async getSummary(id: string): Promise<{ summary: string }> {
    const cacheKey = `summary:${id}`;

    // 1. Redis 캐시 확인
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return { summary: cached };

    // 2. MongoDB의 기존 ai_summary 확인
    const content = await this.contentModel.findById(id).lean().exec();
    if (!content) throw new NotFoundException(`Content ${id} not found`);

    if (content.ai_summary) {
      await this.cacheService.set(cacheKey, content.ai_summary, SUMMARY_CACHE_TTL);
      return { summary: content.ai_summary };
    }

    // 3. Gemini API 호출
    if (!this.gemini) {
      throw new BadRequestException('AI summary is not configured');
    }

    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const contentBody = (content as any).content_body ?? content.summary ?? '';
    const contentTypeLabel =
      content.type === 'youtube' ? 'YouTube 영상' : content.type === 'blog' ? '블로그 포스트' : '채용공고';

    const prompt = `다음 ${contentTypeLabel}을 한국어로 3~5문장으로 간결하게 요약해줘.
제목: ${content.title}
출처: ${content.source_name}
URL: ${content.url}
${contentBody ? `내용: ${contentBody.slice(0, 3000)}` : ''}
핵심 내용만 요약하고, 번호나 불릿 없이 자연스러운 문장으로 작성해줘.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    // 4. MongoDB + Redis 저장
    await this.contentModel.findByIdAndUpdate(id, { ai_summary: summary });
    await this.cacheService.set(cacheKey, summary, SUMMARY_CACHE_TTL);

    return { summary };
  }

  async getRecommended(userId: string | null, limit = 20) {
    if (!userId) {
      return this.contentModel
        .find()
        .sort({ published_at: -1 })
        .limit(limit)
        .lean()
        .exec();
    }

    const subscriptions = await this.subscriptionsService.findByUserId(userId);

    if (subscriptions.length === 0) {
      return this.contentModel
        .find()
        .sort({ published_at: -1 })
        .limit(limit)
        .lean()
        .exec();
    }

    const tagSubs = subscriptions.filter((s) => s.type === 'tag').map((s) => s.tag);
    const channelSubs = subscriptions.filter((s) => s.type === 'channel').map((s) => s.tag);

    const orConditions: Record<string, unknown>[] = [];
    if (tagSubs.length > 0) {
      orConditions.push({ tags: { $in: tagSubs } });
    }
    if (channelSubs.length > 0) {
      orConditions.push({ source_name: { $in: channelSubs } });
    }

    if (orConditions.length === 0) {
      return this.contentModel
        .find()
        .sort({ published_at: -1 })
        .limit(limit)
        .lean()
        .exec();
    }

    return this.contentModel
      .find({ $or: orConditions })
      .sort({ published_at: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
