export const config = {
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:3101/techfeed',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL ?? 'http://localhost:3102',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:3103',
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
};

export const blogSources = [
  // 해외
  { name: 'dev.to', url: 'https://dev.to/feed', tags: ['webdev'] },
  { name: 'Anthropic', url: 'https://www.anthropic.com/rss.xml', tags: ['ai', 'llm'] },

  // 국내 대기업 기술 블로그
  { name: '네이버 D2', url: 'https://d2.naver.com/d2.atom', tags: ['naver'] },
  { name: '카카오 Tech', url: 'https://tech.kakao.com/feed/', tags: ['kakao'] },
  { name: '카카오페이 Tech', url: 'https://tech.kakaopay.com/rss.xml', tags: ['kakao', 'fintech'] },
  { name: '카카오뱅크 Tech', url: 'https://tech.kakaobank.com/rss', tags: ['kakao', 'fintech'] },
  { name: '우아한형제들', url: 'https://techblog.woowahan.com/feed/', tags: ['baemin'] },
  { name: '당근', url: 'https://medium.com/feed/daangn', tags: ['daangn'] },
  { name: '올리브영 Tech', url: 'https://oliveyoung.tech/rss', tags: ['oliveyoung'] },
  { name: 'LINE Engineering', url: 'https://engineering.linecorp.com/ko/feed/atom', tags: ['line'] },
  { name: '토스 Tech', url: 'https://toss.tech/rss.xml', tags: ['toss', 'fintech'] },
  { name: '쿠팡 Engineering', url: 'https://medium.com/feed/coupang-engineering', tags: ['coupang'] },
  { name: '컬리 Tech', url: 'https://helloworld.kurly.com/feed.xml', tags: ['kurly'] },

  // 커뮤니티
  { name: '긱뉴스', url: 'https://news.hada.io/rss', tags: ['news'] },
];

export const youtubeSources = [
  // 해외
  { name: 'Fireship', channelId: 'UCsBjURrPoezykLs9EqgamOA', tags: ['webdev'] },
  { name: 'Theo', channelId: 'UCbRP3c757lWg9M-U7TyEkXA', tags: ['webdev', 'react'] },
  { name: 'The Primeagen', channelId: 'UC8ENHE5xdFSwx71WHd4Ar7Q', tags: ['rust', 'backend'] },

  // 국내
  { name: '우아한Tech', channelId: 'UCgWQRq64kNRMBzEjUERfixg', tags: ['baemin', 'backend'] },
  { name: 'NAVER D2', channelId: 'UCNfSsRMFqDYxHmGBmBqNPXQ', tags: ['naver'] },
];

export const jobSources = [
  {
    name: 'Wanted',
    type: 'wanted-api' as const,
    tags: ['job'],
  },
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
  java: ['java', 'spring', 'springboot'],
  kotlin: ['kotlin'],
  aws: ['aws', 'ec2', 's3', 'lambda'],
  msa: ['msa', 'microservice', '마이크로서비스'],
  ai: ['ai', 'llm', 'gpt', 'claude', 'gemini', '머신러닝', 'machine learning'],
  database: ['database', 'mysql', 'postgresql', 'mongodb', 'redis'],
  devops: ['devops', 'ci/cd', 'terraform', 'ansible'],
};
