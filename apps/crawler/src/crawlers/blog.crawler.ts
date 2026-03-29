import Parser from 'rss-parser';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';
import { blogSources, keywordTagMap } from '../config';
import { CrawlerSourceDoc } from '../models/source.model';

const TECH_KEYWORDS = Object.values(keywordTagMap).flat();

const parser = new Parser({
  customFields: {
    item: ['content'],
  },
});

function hasKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
}

export class BlogCrawler extends BaseCrawler {
  private sources: Array<{ name: string; url: string; tags: string[] }>;

  constructor(
    esClient: Client,
    redis: Redis,
    dbSources?: CrawlerSourceDoc[],
  ) {
    super(esClient, redis);
    if (dbSources && dbSources.length > 0) {
      this.sources = dbSources
        .filter((s) => s.type === 'blog' && s.url)
        .map((s) => ({ name: s.name, url: s.url!, tags: s.tags }));
    } else {
      this.sources = blogSources.map((s) => ({ name: s.name, url: s.url, tags: [...s.tags] }));
    }
  }

  async crawl(): Promise<RawContent[]> {
    const results: RawContent[] = [];

    for (const source of this.sources) {
      try {
        const feed = await parser.parseURL(source.url);

        for (const item of feed.items) {
          if (!item.link || !item.title) continue;

          // Velog: Korean filter + tech keyword filter
          if (source.name === 'Velog 트렌딩') {
            if (!hasKorean(item.title)) continue;
            const text = `${item.title} ${item.contentSnippet ?? ''}`.toLowerCase();
            const isTech = TECH_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
            if (!isTech) continue;
          }

          results.push({
            type: 'blog',
            title: item.title,
            url: item.link,
            summary: (() => {
              const snippet = item.contentSnippet ?? item.summary ?? undefined;
              const fullContent = (item as any).content ? stripHtml((item as any).content) : undefined;
              if (fullContent && fullContent.length > (snippet?.length ?? 0)) return fullContent;
              return snippet;
            })(),
            thumbnail: item.enclosure?.url ?? undefined,
            tags: [...source.tags],
            source_name: source.name,
            published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
          });
        }

        console.log(`[BlogCrawler] Parsed ${feed.items.length} items from ${source.name}`);
      } catch (err) {
        console.error(`[BlogCrawler] Failed to fetch ${source.url}:`, err);
      }
    }

    return results;
  }
}
