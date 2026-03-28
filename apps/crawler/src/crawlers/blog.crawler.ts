import Parser from 'rss-parser';
import { Client } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { BaseCrawler, RawContent } from './base.crawler';
import { blogSources } from '../config';

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
  constructor(esClient: Client, redis: Redis) {
    super(esClient, redis);
  }

  async crawl(): Promise<RawContent[]> {
    const results: RawContent[] = [];

    for (const source of blogSources) {
      try {
        const feed = await parser.parseURL(source.url);

        for (const item of feed.items) {
          if (!item.link || !item.title) continue;

          // Filter non-Korean posts from Velog (Chinese spam)
          if (source.name === 'Velog 트렌딩' && !hasKorean(item.title)) continue;

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
