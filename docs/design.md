# TechFeed — Design Document

> 개발자를 위한 콘텐츠 큐레이션 앱
> 테크 블로그 / YouTube / 채용공고를 수집·검색·알림

---

## 목표

- 흩어진 개발자 콘텐츠를 한 곳에서 소비
- 관심 태그 기반 필터링 + 전문 검색
- 새 콘텐츠 등록 시 푸시 알림
- 각 기술 스택의 역할이 명확한 포트폴리오 프로젝트

---

## 아키텍처

```
[Expo (React Native)]
        │
        ↓
[NestJS API Server]
   ├── 검색           → Elasticsearch
   ├── 피드 캐시/랭킹  → Redis
   ├── 이벤트 저장    → PostgreSQL + TimescaleDB 확장
   └── 푸시 알림      → FCM
        │
[Crawler + BullMQ (15분 간격)]
   ├── 1. 테크 블로그  → RSS 파싱 (rss-parser)
   ├── 2. YouTube     → YouTube Data API v3 + Gemini 요약 (lazy)
   └── 3. 채용공고    → cheerio HTML 스크래핑
        │
        ↓
   MongoDB (원본 저장)
   Elasticsearch (검색 인덱싱)
   Redis (캐시/랭킹 업데이트 + Pub/Sub → FCM)
```

---

## 기술 스택

| 카테고리 | 기술 | 역할 |
|---------|------|------|
| 모바일 | Expo (React Native) | iOS/Android 공통 앱 |
| 백엔드 | NestJS (TypeScript) | REST API 서버 |
| 원본 저장 | **MongoDB** | 크롤링 원본 데이터 저장 (비정형, Source of Truth) |
| 전문 검색 | Elasticsearch | 콘텐츠 전문 검색, 태그 필터링, 자동완성 |
| 캐시/랭킹 | Redis | 피드 캐시, 인기 랭킹 (Sorted Set), Pub/Sub 알림 트리거 |
| 유저/이벤트 | PostgreSQL + TimescaleDB 확장 | 유저·북마크·구독(관계형) + 유저 이벤트(시계열) |
| 푸시 알림 | FCM (firebase-admin) | iOS/Android 공통 푸시 |
| 크롤러 큐 | BullMQ (Redis 기반) | 크롤링 작업 큐 — 재시도/실패 처리, 레이트리밋 |
| 크롤러 | rss-parser + cheerio + YouTube Data API v3 | 콘텐츠 수집 |
| 영상 요약 | Gemini API | 자막 추출 → 요약 (트렌딩 임계값 도달 시 lazy 실행) |
| 인프라 | Docker Compose | 로컬 개발 및 배포 일관성 |

---

## 콘텐츠 수집 소스

### 1. 테크 블로그 (RSS)

RSS 피드 URL을 소스 목록에 등록. `rss-parser`로 파싱.

```ts
const blogSources = [
  { url: 'https://dev.to/feed', tags: ['general', 'webdev'] },
  // 추가 예정
];
```

RSS 없는 블로그는 `cheerio`로 HTML 직접 파싱.

### 2. YouTube 채널

YouTube Data API v3로 신규 영상 감지 → `youtube-transcript`로 자막 추출 → Gemini API로 요약.

- YouTube API 할당량 절약을 위해 하루 1-2회 크롤링
- Gemini 요약은 **lazy 실행** — 트렌딩 임계값 도달 시 or 유저 요청 시에만

```ts
const youtubeSources = [
  { channelId: 'CHANNEL_ID', tags: ['youtube', 'backend'] },
  // 추가 예정
];
```

카드 구성: 썸네일 + 제목 + Gemini 요약 + 영상 링크

### 3. 채용공고

`axios + cheerio`로 HTML 스크래핑. JS 렌더링 필요 시 Playwright.

```ts
const jobSources = [
  { url: 'https://example.com/jobs', parser: 'wantedParser', tags: ['job', 'backend'] },
  // 추가 예정
];
```

---

## 태그 시스템

태그는 두 단계로 부여:

1. **소스 레벨** — 크롤러 설정에서 사전 지정 (위 소스 목록의 `tags`)
2. **콘텐츠 레벨** — 제목/본문 키워드 매핑으로 자동 추출

```ts
const keywordTagMap = {
  react: ['react', 'react native'],
  typescript: ['typescript', 'ts'],
  kubernetes: ['kubernetes', 'k8s'],
  // ...
};
```

Elasticsearch의 `keyword` 타입 필드로 저장 → 필터 쿼리로 빠른 탭별 필터링.

---

## 데이터 모델

### MongoDB — 콘텐츠 원본 (Source of Truth)

소스 타입마다 구조가 다른 비정형 데이터를 유연하게 저장.

```ts
// 블로그
{ type: 'blog', title, url, content, author, tags, published_at, source_name }

// YouTube
{ type: 'youtube', title, url, thumbnail, summary, duration, channel_name, tags, published_at }

// 채용공고
{ type: 'job', title, url, company, stack, location, tags, published_at }
```

URL SHA256 해싱으로 중복 체크.

### Elasticsearch — 검색 인덱스

MongoDB 저장 후 크롤러에서 직접 인덱싱 (Logstash 없이 단순하게).

```json
{
  "mappings": {
    "properties": {
      "title":        { "type": "text", "analyzer": "english" },
      "summary":      { "type": "text" },
      "url":          { "type": "keyword" },
      "source_type":  { "type": "keyword" },
      "source_name":  { "type": "keyword" },
      "tags":         { "type": "keyword" },
      "thumbnail":    { "type": "keyword" },
      "published_at": { "type": "date" },
      "view_count":   { "type": "integer" }
    }
  }
}
```

`source_type`: `"blog"` | `"youtube"` | `"job"`

### PostgreSQL + TimescaleDB 확장

같은 인스턴스에서 관계형 데이터 + 시계열 이벤트 함께 관리.

```sql
-- 관계형 (일반 테이블)
users         (id, email, fcm_token, created_at)
subscriptions (user_id, tag)
bookmarks     (user_id, content_id, created_at)
push_logs     (id, user_id, content_id, sent_at, type)

-- 시계열 (hypertable)
CREATE TABLE user_events (
    time        TIMESTAMPTZ NOT NULL,
    user_id     UUID,
    event_type  VARCHAR(50),   -- 'read', 'bookmark', 'click'
    content_id  VARCHAR(100),
    tag         VARCHAR(50),
    duration_ms INTEGER,
    metadata    JSONB
);
SELECT create_hypertable('user_events', 'time');
```

### Redis 키 구조

```
feed:main              → List  (메인 피드 캐시, TTL 5분)
feed:{source_type}     → List  (탭별 피드 캐시, TTL 5분)
rank:contents          → Sorted Set (score=시간감쇠 점수)
rank:tags              → Sorted Set (score=조회수)
user:{id}:tags         → Set   (유저 구독 태그)
```

---

## API 설계

### Contents

```
GET  /contents?q=&tags=&source_type=&page=   검색 + 필터 (ES)
GET  /contents/trending                       인기 콘텐츠 (Redis ZSet)
GET  /contents/:id                            상세 + 조회 이벤트 기록
GET  /contents/:id/summary                    Gemini 요약 (lazy 생성)
```

### User

```
POST /auth/signup
POST /auth/login
GET  /users/me
PUT  /users/me/tags          구독 태그 설정
GET  /users/me/bookmarks
POST /users/me/bookmarks/:id
```

### Events

```
POST /events                 유저 이벤트 배치 수집
```

### Push

```
POST /push/subscribe         FCM 토큰 등록
```

---

## 크롤링 → 푸시 흐름

```
BullMQ Job (15분 간격)
  → RSS / YouTube API / cheerio 크롤링
  → URL 해싱으로 중복 체크
  → MongoDB 저장 (원본)
  → Elasticsearch 인덱싱 (검색)
  → Redis 랭킹 업데이트
  → Redis PUBLISH "new_content" {tags: [...]}
        ↓
  Subscriber: user:{id}:tags 와 매칭
        ↓
  FCM 푸시 발송
        ↓
  PostgreSQL push_logs 기록 + user_events 기록
```

---

## 앱 화면 구성

```
├── 피드 탭
│   ├── 전체 (기본)
│   ├── 블로그
│   ├── YouTube
│   └── 채용공고
├── 검색 탭       (ES 전문 검색 + 태그 필터)
├── 북마크 탭
└── 설정 탭
    └── 구독 태그 관리 (푸시 알림 대상)
```

---

## 구현 단계

### Phase 1 — 백엔드 기반 + 크롤러 (M, ~3일)
- [ ] NestJS 프로젝트 셋업
- [ ] Docker Compose (MongoDB + ES + Redis + PostgreSQL/TimescaleDB)
- [ ] BullMQ 크롤러 큐 기본 구조
- [ ] 크롤러 구현 (블로그 RSS 1개, YouTube 1개, 채용 1개)
- [ ] MongoDB 저장 + ES 인덱싱
- [ ] Contents 검색/조회 API

### Phase 2 — 캐시 & 랭킹 (S, ~1일)
- [ ] Redis 피드 캐시 (탭별 TTL)
- [ ] 인기 콘텐츠 Sorted Set
- [ ] 자동완성 API

### Phase 3 — 유저 & 인증 (M, ~2일)
- [ ] JWT 회원가입/로그인
- [ ] 구독 태그 관리
- [ ] 북마크

### Phase 4 — 푸시 알림 (M, ~2일)
- [ ] FCM 셋업
- [ ] Redis Pub/Sub → 태그 매칭 → FCM 발송
- [ ] 주간 트렌드 예약 푸시

### Phase 5 — Expo 앱 (L, ~5일)
- [ ] 피드/검색/북마크 화면
- [ ] 탭별 source_type 필터
- [ ] 태그 구독 설정
- [ ] 푸시 수신 처리

### Phase 6 — 이벤트 분석 (M, ~2일)
- [ ] TimescaleDB 유저 이벤트 수집
- [ ] 트렌드 분석 쿼리
- [ ] Grafana 대시보드 연동 (devops-monitor)

---

## 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| YouTube 자막 없는 영상 | 자막 없으면 요약 스킵, 제목만 저장 |
| YouTube API 할당량 | 하루 1-2회 크롤링, 할당량 모니터링 |
| Gemini 요약 비용 | lazy 실행 — 트렌딩 임계값 도달 시 or 유저 요청 시에만 |
| 채용공고 사이트 구조 변경 | 파서 모듈화로 사이트별 독립 유지 |
| ES 메모리 | JVM Heap 512m 제한 |
| 크롤링 중복 | URL SHA256 해싱으로 저장 전 중복 체크 |
| FCM 토큰 만료 | 로그인 시 토큰 갱신, 만료 토큰 자동 정리 |
| ES 인덱스 무한 증가 | ILM — 90일 이상 콘텐츠 cold 티어 이동 |
