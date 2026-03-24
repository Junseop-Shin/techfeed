export const config = {
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:3101/techfeed',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL ?? 'http://localhost:3102',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:3103',
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
};

export const blogSources = [
  { name: 'dev.to', url: 'https://dev.to/feed', tags: ['general', 'webdev'] },
];

export const youtubeSources = [
  {
    name: 'Fireship',
    channelId: 'UCsBjURrPoezykLs9EqgamOA',
    tags: ['youtube', 'webdev'],
  },
];

export const jobSources = [
  { name: 'wanted', url: 'https://www.wanted.co.kr/wdlist/518', tags: ['job'] },
];

export const keywordTagMap: Record<string, string[]> = {
  react: ['react', 'react native'],
  typescript: ['typescript', 'ts'],
  kubernetes: ['kubernetes', 'k8s'],
  nextjs: ['next.js', 'nextjs'],
  docker: ['docker', 'container'],
  python: ['python'],
  rust: ['rust'],
  golang: ['golang', 'go lang'],
};
