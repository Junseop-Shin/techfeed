import * as crypto from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Model } from 'mongoose';
import { Content, ContentDocument } from './content.schema';
import { SearchService, SearchContentsOptions } from '../search/search.service';
import { CacheService } from '../cache/cache.service';

const SUMMARY_CACHE_TTL = 60 * 60 * 24 * 7; // 7일

@Injectable()
export class ContentsService {
  private readonly gemini: GoogleGenerativeAI | null;

  constructor(
    @InjectModel(Content.name) private readonly contentModel: Model<ContentDocument>,
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.gemini = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async search(opts: SearchContentsOptions) {
    const cacheKey = 'search:' + crypto.createHash('md5').update(JSON.stringify(opts)).digest('hex');
    const cached = await this.cacheService.getFeedCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.searchService.searchContents(opts);
    await this.cacheService.setFeedCache(cacheKey, JSON.stringify(result));
    return result;
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

    if (content.type !== 'youtube') {
      throw new BadRequestException('Summary is only available for YouTube content');
    }

    if (content.ai_summary) {
      await this.cacheService.set(cacheKey, content.ai_summary, SUMMARY_CACHE_TTL);
      return { summary: content.ai_summary };
    }

    // 3. Gemini API 호출
    if (!this.gemini) {
      throw new BadRequestException('AI summary is not configured');
    }

    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `다음 YouTube 영상을 한국어로 3~5문장으로 간결하게 요약해줘.
제목: ${content.title}
채널: ${content.source_name}
URL: ${content.url}
${content.summary ? `설명: ${content.summary}` : ''}
핵심 내용만 요약하고, 번호나 불릿 없이 자연스러운 문장으로 작성해줘.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    // 4. MongoDB + Redis 저장
    await this.contentModel.findByIdAndUpdate(id, { ai_summary: summary });
    await this.cacheService.set(cacheKey, summary, SUMMARY_CACHE_TTL);

    return { summary };
  }
}
