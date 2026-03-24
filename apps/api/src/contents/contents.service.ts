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
    return this.searchService.searchContents(opts);
  }

  async getTrending() {
    const ids = await this.cacheService.getTrending(20);
    if (ids.length === 0) return [];

    const contents = await this.contentModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec();

    // Preserve ranking order from Redis ZSet
    const contentMap = new Map(contents.map((c) => [String(c._id), c]));
    return ids.map((id) => contentMap.get(id)).filter(Boolean);
  }

  async findById(id: string) {
    const content = await this.contentModel.findById(id).lean().exec();
    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    await this.cacheService.incrementViewCount(id);

    return content;
  }
}
