import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  QueryDslQueryContainer,
  QueryDslBoolQuery,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchService } from './elasticsearch.provider';

const INDEX_NAME = 'contents';

export interface SearchContentsOptions {
  q?: string;
  tags?: string[];
  source_type?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly es: ElasticsearchService) {}

  async onModuleInit() {
    await this.ensureIndex();
  }

  private async ensureIndex() {
    const exists = await this.es.client.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await this.es.client.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'english' },
            summary: { type: 'text' },
            url: { type: 'keyword' },
            source_type: { type: 'keyword' },
            source_name: { type: 'keyword' },
            tags: { type: 'keyword' },
            thumbnail: { type: 'keyword' },
            published_at: { type: 'date' },
            view_count: { type: 'integer' },
          },
        },
      });
      this.logger.log(`Elasticsearch index "${INDEX_NAME}" created`);
    } else {
      this.logger.log(`Elasticsearch index "${INDEX_NAME}" already exists`);
    }
  }

  async indexContent(id: string, doc: Record<string, unknown>) {
    await this.es.client.index({
      index: INDEX_NAME,
      id,
      document: doc,
    });
  }

  async searchContents(opts: SearchContentsOptions) {
    const { q, tags, source_type, page = 1, limit = 20 } = opts;
    const from = (page - 1) * limit;

    const must: QueryDslQueryContainer[] = [];
    const filter: QueryDslQueryContainer[] = [];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['title', 'summary'],
        },
      });
    }

    if (tags && tags.length > 0) {
      filter.push({ terms: { tags } });
    }

    if (source_type) {
      filter.push({ term: { source_type } });
    }

    let query: QueryDslQueryContainer;

    if (must.length > 0 || filter.length > 0) {
      const bool: QueryDslBoolQuery = {};
      if (must.length > 0) bool.must = must;
      if (filter.length > 0) bool.filter = filter;
      query = { bool };
    } else {
      query = { match_all: {} };
    }

    const result = await this.es.client.search({
      index: INDEX_NAME,
      from,
      size: limit,
      query,
      sort: [{ published_at: { order: 'desc' } }],
    });

    const hits = result.hits.hits;
    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total?.value ?? 0);

    return {
      total,
      page,
      limit,
      items: hits.map((h) => ({ id: h._id, ...(h._source as Record<string, unknown>) })),
    };
  }
}
