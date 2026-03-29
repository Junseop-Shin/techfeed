import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlerSource, SourceDocument } from './source.schema';

const INITIAL_BLOG_SOURCES = [
  { type: 'blog', name: '네이버 D2', url: 'https://d2.naver.com/d2.atom', tags: ['naver'] },
  { type: 'blog', name: '카카오 Tech', url: 'https://tech.kakao.com/feed/', tags: ['kakao'] },
  { type: 'blog', name: '카카오페이 Tech', url: 'https://tech.kakaopay.com/rss.xml', tags: ['kakao', 'fintech'] },
  { type: 'blog', name: '카카오뱅크 Tech', url: 'https://tech.kakaobank.com/rss', tags: ['kakao', 'fintech'] },
  { type: 'blog', name: '우아한형제들', url: 'https://techblog.woowahan.com/feed/', tags: ['baemin'] },
  { type: 'blog', name: '당근', url: 'https://medium.com/feed/daangn', tags: ['daangn'] },
  { type: 'blog', name: '올리브영 Tech', url: 'https://oliveyoung.tech/rss', tags: ['oliveyoung'] },
  { type: 'blog', name: 'LINE Engineering', url: 'https://engineering.linecorp.com/ko/feed/atom', tags: ['line'] },
  { type: 'blog', name: '토스 Tech', url: 'https://toss.tech/rss.xml', tags: ['toss', 'fintech'] },
  { type: 'blog', name: '쿠팡 Engineering', url: 'https://medium.com/feed/coupang-engineering', tags: ['coupang'] },
  { type: 'blog', name: '컬리 Tech', url: 'https://helloworld.kurly.com/feed.xml', tags: ['kurly'] },
  { type: 'blog', name: '현대자동차 Tech', url: 'https://techblog.hyundai.com/rss', tags: ['hyundai'] },
  { type: 'blog', name: '라인플러스 Tech', url: 'https://techblog.lycorp.co.jp/ko/feed/rss', tags: ['line'] },
  { type: 'blog', name: '뱅크샐러드 Tech', url: 'https://blog.banksalad.com/rss.xml', tags: ['banksalad', 'fintech'] },
  { type: 'blog', name: '무신사 Tech', url: 'https://medium.com/feed/musinsa-tech', tags: ['musinsa'] },
  { type: 'blog', name: 'Velog 트렌딩', url: 'https://v2.velog.io/rss', tags: ['news', 'velog'] },
  { type: 'blog', name: '요즘IT', url: 'https://yozm.wishket.com/magazine/feed/', tags: ['news'] },
] as const;

const INITIAL_YOUTUBE_SOURCES = [
  { type: 'youtube', name: '코딩애플', channelId: 'UCSLrpBAzr-ROVGHQ5EmxnUg', tags: ['webdev', 'javascript'] },
  { type: 'youtube', name: '노마드 코더', channelId: 'UCUpJs89fSBXNolQGOYKn0YQ', tags: ['webdev', 'react'] },
  { type: 'youtube', name: '드림코딩', channelId: 'UC_4u-bXaba7yrRz_6x6kb_w', tags: ['webdev', 'javascript'] },
  { type: 'youtube', name: '우아한Tech', channelId: 'UCgWQRq64kNRMBzEjUERfixg', tags: ['baemin', 'backend'] },
  { type: 'youtube', name: 'NAVER D2', channelId: 'UCNfSsRMFqDYxHmGBmBqNPXQ', tags: ['naver'] },
] as const;

const INITIAL_JOB_SOURCES = [
  { type: 'job', name: 'Wanted', subType: 'wanted-api', tags: ['job'] },
  { type: 'job', name: 'Jumpit', subType: 'jumpit-api', tags: ['job'] },
] as const;

@Injectable()
export class SourcesService implements OnModuleInit {
  constructor(
    @InjectModel(CrawlerSource.name)
    private readonly model: Model<SourceDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.model.countDocuments();
    if (count === 0) {
      await this.model.insertMany([
        ...INITIAL_BLOG_SOURCES,
        ...INITIAL_YOUTUBE_SOURCES,
        ...INITIAL_JOB_SOURCES,
      ]);
    }
  }

  findAll(type?: string): Promise<SourceDocument[]> {
    const filter = type ? { type, enabled: true } : { enabled: true };
    return this.model.find(filter).sort({ name: 1 }).exec();
  }

  create(data: Partial<CrawlerSource>): Promise<SourceDocument> {
    return this.model.create(data);
  }

  async update(id: string, data: Partial<CrawlerSource>): Promise<SourceDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async remove(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}
