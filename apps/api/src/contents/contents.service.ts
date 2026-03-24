import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Content, ContentDocument } from './content.schema';
import { SearchService, SearchContentsOptions } from '../search/search.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ContentsService {
  constructor(
    @InjectModel(Content.name) private readonly contentModel: Model<ContentDocument>,
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
  ) {}

  async search(opts: SearchContentsOptions) {
    const cacheKey = opts.source_type ?? 'main';
    const cached = await this.cacheService.getFeedCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.searchService.searchContents(opts);
    await this.cacheService.setFeedCache(cacheKey, JSON.stringify(result));
    return result;
  }

  async getTrending() {
    const cached = await this.cacheService.getFeedCache('trending');
    if (cached) return JSON.parse(cached);

    const ids = await this.cacheService.getTrending(20);
    if (ids.length === 0) return [];

    const contents = await this.contentModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec();

    const contentMap = new Map(contents.map((c) => [String(c._id), c]));
    const result = ids.map((id) => contentMap.get(id)).filter(Boolean);

    await this.cacheService.setFeedCache('trending', JSON.stringify(result));
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
}
