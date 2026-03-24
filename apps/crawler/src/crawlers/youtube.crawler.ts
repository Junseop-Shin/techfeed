import { youtube_v3, auth } from '@googleapis/youtube';
import { Client } from '@elastic/elasticsearch';
import { BaseCrawler, RawContent } from './base.crawler';
import { youtubeSources, config } from '../config';

export class YouTubeCrawler extends BaseCrawler {
  constructor(esClient: Client) {
    super(esClient);
  }

  async crawl(): Promise<RawContent[]> {
    if (!config.youtubeApiKey) {
      console.warn('[YouTubeCrawler] YOUTUBE_API_KEY not set, skipping');
      return [];
    }

    const youtube = new youtube_v3.Youtube({
      auth: config.youtubeApiKey,
    });

    const results: RawContent[] = [];

    for (const source of youtubeSources) {
      try {
        // Get the channel's uploads playlist
        const channelRes = await youtube.channels.list({
          part: ['contentDetails'],
          id: [source.channelId],
          maxResults: 1,
        });

        const uploadsPlaylistId =
          channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsPlaylistId) continue;

        // Fetch latest videos from uploads playlist
        const playlistRes = await youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: 10,
        });

        for (const item of playlistRes.data.items ?? []) {
          const snippet = item.snippet;
          if (!snippet?.resourceId?.videoId || !snippet.title) continue;

          const videoId = snippet.resourceId.videoId;
          const url = `https://www.youtube.com/watch?v=${videoId}`;
          const thumbnail =
            snippet.thumbnails?.high?.url ??
            snippet.thumbnails?.default?.url ??
            undefined;

          results.push({
            type: 'youtube',
            title: snippet.title,
            url,
            summary: snippet.description ?? undefined,
            thumbnail: thumbnail ?? undefined,
            tags: [...source.tags],
            source_name: source.name,
            published_at: snippet.publishedAt
              ? new Date(snippet.publishedAt)
              : new Date(),
          });
        }

        console.log(
          `[YouTubeCrawler] Fetched ${playlistRes.data.items?.length ?? 0} videos from ${source.name}`,
        );
      } catch (err) {
        console.error(`[YouTubeCrawler] Failed for channel ${source.channelId}:`, err);
      }
    }

    return results;
  }
}
