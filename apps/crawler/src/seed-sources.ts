import { CrawlerSourceModel } from './models/source.model';
import { blogSources, youtubeSources, jobSources } from './config';

export async function seedSources(): Promise<void> {
  const count = await CrawlerSourceModel.countDocuments();
  if (count > 0) {
    console.log(`[Seed] Sources already seeded (${count} records), skipping`);
    return;
  }

  const blogDocs = blogSources.map((s) => ({
    type: 'blog' as const,
    name: s.name,
    url: s.url,
    tags: [...s.tags],
    enabled: true,
  }));

  const youtubeDocs = youtubeSources.map((s) => ({
    type: 'youtube' as const,
    name: s.name,
    channelId: s.channelId,
    tags: [...s.tags],
    enabled: true,
  }));

  const jobDocs = jobSources.map((s) => ({
    type: 'job' as const,
    name: s.name,
    subType: s.type, // 'wanted-api' | 'jumpit-api'
    tags: [...s.tags],
    enabled: true,
  }));

  await CrawlerSourceModel.insertMany([...blogDocs, ...youtubeDocs, ...jobDocs]);
  console.log(`[Seed] Seeded ${blogDocs.length} blog + ${youtubeDocs.length} YouTube + ${jobDocs.length} job sources`);
}
