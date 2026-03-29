import {
  Controller,
  Get,
  Ip,
  Param,
  Query,
  BadRequestException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ContentsService } from './contents.service';
import { SearchContentsQueryDto } from './dto/search-contents.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  /**
   * GET /contents?q=&tags=&source_type=&page=&limit=
   * Full-text search via Elasticsearch with optional filters.
   */
  @Get()
  async search(@Query() query: SearchContentsQueryDto) {
    const tags = query.tags
      ? query.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    return this.contentsService.search({
      q: query.q,
      tags,
      source_type: query.source_type,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });
  }

  /**
   * GET /contents/trending
   * Returns top trending content IDs from Redis Sorted Set.
   * Must be declared before /:id to avoid route conflict.
   */
  @Get('trending')
  async trending() {
    return this.contentsService.getTrending();
  }

  /**
   * GET /contents/recommended
   * Returns personalized feed based on user subscriptions.
   * Falls back to latest content for unauthenticated users.
   */
  @Get('recommended')
  @UseGuards(OptionalJwtAuthGuard)
  async recommended(
    @Request() req: { user?: { userId: string } },
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId ?? null;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.contentsService.getRecommended(userId, parsedLimit);
  }

  /**
   * GET /contents/autocomplete?q=
   * Returns title suggestions from Elasticsearch (phrase_prefix).
   * Must be declared before /:id to avoid route conflict.
   */
  @Get('autocomplete')
  async autocomplete(@Query('q') q: string) {
    if (!q) throw new BadRequestException('q is required');
    return this.contentsService.autocomplete(q);
  }

  /**
   * GET /contents/:id
   * Fetches detail from MongoDB and increments view count in Redis.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contentsService.findById(id);
  }

  /**
   * GET /contents/:id/summary
   * Returns AI-generated summary for YouTube content.
   * Result is cached in Redis (7 days) and persisted in MongoDB.
   * Rate limited: 5/day (anonymous), 20/day (logged-in), unlimited (premium).
   */
  @Get(':id/summary')
  @UseGuards(OptionalJwtAuthGuard)
  async getSummary(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; email: string } },
    @Ip() ip: string,
  ) {
    return this.contentsService.getSummary(id, req.user ?? null, ip);
  }
}
