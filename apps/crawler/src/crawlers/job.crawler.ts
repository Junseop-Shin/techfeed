import axios from 'axios';
import * as cheerio from 'cheerio';
import { Client } from '@elastic/elasticsearch';
import { BaseCrawler, RawContent } from './base.crawler';
import { jobSources } from '../config';

export class JobCrawler extends BaseCrawler {
  constructor(esClient: Client) {
    super(esClient);
  }

  async crawl(): Promise<RawContent[]> {
    const results: RawContent[] = [];

    for (const source of jobSources) {
      try {
        const items = await this.scrapeWanted(source);
        results.push(...items);
        console.log(`[JobCrawler] Scraped ${items.length} jobs from ${source.name}`);
      } catch (err) {
        console.error(`[JobCrawler] Failed to scrape ${source.url}:`, err);
      }
    }

    return results;
  }

  private async scrapeWanted(source: {
    name: string;
    url: string;
    tags: string[];
  }): Promise<RawContent[]> {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; TechFeedBot/1.0; +https://techfeed.example.com)',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data as string);
    const results: RawContent[] = [];

    // Wanted job listing cards — selector may need adjustment if site structure changes
    $('a[class*="JobCard"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (!href) return;

      const title = $el.find('[class*="title"]').first().text().trim();
      const company = $el.find('[class*="company"]').first().text().trim();
      if (!title) return;

      const url = href.startsWith('http') ? href : `https://www.wanted.co.kr${href}`;

      results.push({
        type: 'job',
        title: company ? `${title} — ${company}` : title,
        url,
        summary: company ?? undefined,
        tags: [...source.tags],
        source_name: source.name,
        published_at: new Date(),
      });
    });

    return results;
  }
}
