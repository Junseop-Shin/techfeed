import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  QueryDslQueryContainer,
  QueryDslBoolQuery,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchService } from './elasticsearch.provider';

const INDEX_NAME = 'contents';
// Bump this version to force index recreation with new settings
const INDEX_VERSION = 2;
const INDEX_VERSION_ALIAS = `${INDEX_NAME}_meta`;

export interface SearchContentsOptions {
  q?: string;
  tags?: string[];
  source_type?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private needsReindex = false;

  constructor(private readonly es: ElasticsearchService) {}

  async onModuleInit() {
    this.needsReindex = await this.ensureIndex();
  }

  get reindexRequired(): boolean {
    return this.needsReindex;
  }

  // Returns true if index was (re)created and needs re-indexing
  private async ensureIndex(): Promise<boolean> {
    const exists = await this.es.client.indices.exists({ index: INDEX_NAME });

    if (exists) {
      // Check if current index has edge_ngram analyzer (version marker)
      try {
        const settings = await this.es.client.indices.getSettings({ index: INDEX_NAME });
        const analysis = (settings[INDEX_NAME] as any)?.settings?.index?.analysis;
        const hasEdgeNgram = analysis?.tokenizer?.edge_ngram_tokenizer != null;
        if (hasEdgeNgram) {
          this.logger.log(`Elasticsearch index "${INDEX_NAME}" already exists (v${INDEX_VERSION})`);
          return false;
        }
      } catch {
        // ignore
      }

      // Old index without edge_ngram — delete and recreate
      this.logger.log(`Elasticsearch index "${INDEX_NAME}" outdated, recreating with edge_ngram...`);
      await this.es.client.indices.delete({ index: INDEX_NAME });
    }

    await this.es.client.indices.create({
      index: INDEX_NAME,
      settings: {
        analysis: {
          tokenizer: {
            edge_ngram_tokenizer: {
              type: 'edge_ngram',
              min_gram: 1,
              max_gram: 20,
              token_chars: ['letter', 'digit'],
            },
          },
          analyzer: {
            edge_ngram_analyzer: {
              type: 'custom',
              tokenizer: 'edge_ngram_tokenizer',
              filter: ['lowercase'],
            },
          },
        },
      } as any,
      mappings: {
        properties: {
          title: { type: 'text', analyzer: 'edge_ngram_analyzer', search_analyzer: 'standard' } as any,
          summary: { type: 'text', analyzer: 'edge_ngram_analyzer', search_analyzer: 'standard' } as any,
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

    this.logger.log(`Elasticsearch index "${INDEX_NAME}" created with edge_ngram analyzer`);
    return true;
  }

  async autocomplete(q: string): Promise<string[]> {
    if (!q || q.length < 1) return [];

    const result = await this.es.client.search({
      index: INDEX_NAME,
      size: 10,
      query: {
        match: {
          title: { query: q, operator: 'and' },
        },
      },
      _source: ['title'],
    });

    return result.hits.hits.map((h) => (h._source as { title: string }).title);
  }

  async indexContent(id: string, doc: Record<string, unknown>) {
    await this.es.client.index({
      index: INDEX_NAME,
      id,
      document: doc,
    });
  }

  async searchContents(opts: SearchContentsOptions) {
    const { q, tags, source_type, page = 1, limit = 20, sort = 'date' } = opts;
    const from = (page - 1) * limit;

    const must: QueryDslQueryContainer[] = [];
    const filter: QueryDslQueryContainer[] = [];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['title^2', 'summary'],
          operator: 'and',
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

    const esSort =
      sort === 'views'
        ? [{ view_count: { order: 'desc' as const } }]
        : [{ published_at: { order: 'desc' as const } }];

    const result = await this.es.client.search({
      index: INDEX_NAME,
      from,
      size: limit,
      query,
      sort: esSort,
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
