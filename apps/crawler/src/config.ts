export const config = {
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:3101/techfeed',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL ?? 'http://localhost:3102',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:3103',
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
};

export const blogSources = [
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
  { name: '현대자동차 Tech', url: 'https://techblog.hyundai.com/rss', tags: ['hyundai'] },
  { name: '라인플러스 Tech', url: 'https://techblog.lycorp.co.jp/ko/feed/rss', tags: ['line'] },
  { name: '뱅크샐러드 Tech', url: 'https://blog.banksalad.com/rss.xml', tags: ['banksalad', 'fintech'] },
  { name: '무신사 Tech', url: 'https://medium.com/feed/musinsa-tech', tags: ['musinsa'] },

  // 커뮤니티 / 미디어
  { name: 'Velog 트렌딩', url: 'https://v2.velog.io/rss', tags: ['news', 'velog'] },
  { name: '요즘IT', url: 'https://yozm.wishket.com/magazine/feed/', tags: ['news'] },
];

export const youtubeSources = [
  // 국내
  { name: '코딩애플', channelId: 'UCSLrpBAzr-ROVGHQ5EmxnUg', tags: ['webdev', 'javascript'] },
  { name: '노마드 코더', channelId: 'UCUpJs89fSBXNolQGOYKn0YQ', tags: ['webdev', 'react'] },
  { name: '드림코딩', channelId: 'UC_4u-bXaba7yrRz_6x6kb_w', tags: ['webdev', 'javascript'] },
  { name: '우아한Tech', channelId: 'UCgWQRq64kNRMBzEjUERfixg', tags: ['baemin', 'backend'] },
  { name: 'NAVER D2', channelId: 'UCNfSsRMFqDYxHmGBmBqNPXQ', tags: ['naver'] },
];

export const jobSources = [
  { name: 'Wanted', type: 'wanted-api' as const, tags: ['job'] },
  { name: 'Jumpit', type: 'jumpit-api' as const, tags: ['job'] },
  { name: 'Programmers', type: 'programmers-api' as const, tags: ['job'] },
  { name: 'Remember', type: 'remember-api' as const, tags: ['job'] },
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
  swift: ['swift', 'ios', 'swiftui'],
  aws: ['aws', 'ec2', 's3', 'lambda'],
  msa: ['msa', 'microservice', '마이크로서비스'],
  ai: ['ai', 'llm', 'gpt', 'claude', 'gemini', '머신러닝', 'machine learning'],
  database: ['database', 'mysql', 'postgresql', 'mongodb', 'redis'],
  devops: ['devops', 'ci/cd', 'terraform', 'ansible'],
};
