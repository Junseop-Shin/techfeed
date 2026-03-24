# TechFeed

개발자를 위한 콘텐츠 큐레이션 앱. 테크 블로그 · YouTube · 채용공고를 한 곳에서.

---

## 주요 기능

- **피드** — 블로그 RSS, YouTube 채널, 채용공고 자동 수집 (15분 간격)
- **검색** — Elasticsearch 전문 검색 + 태그/소스 필터링 + 자동완성
- **랭킹** — Redis Sorted Set 기반 시간 감쇠 트렌딩
- **푸시 알림** — 구독 태그에 새 콘텐츠 등록 시 FCM 즉시 푸시
- **북마크** — 관심 콘텐츠 저장
- **이벤트 분석** — TimescaleDB 기반 유저 행동 시계열 저장

---

## 기술 스택

| 역할 | 기술 |
|------|------|
| 모바일 앱 | Expo (React Native) |
| 백엔드 API | NestJS (TypeScript) |
| 원본 저장 | MongoDB |
| 전문 검색 | Elasticsearch |
| 캐시 / 랭킹 | Redis |
| 유저 / 북마크 | PostgreSQL + TypeORM |
| 시계열 이벤트 | TimescaleDB |
| 푸시 알림 | FCM (firebase-admin) |
| 크롤러 큐 | BullMQ |
| 인프라 | Docker Compose |

---

## 프로젝트 구조

```
techfeed/
├── apps/
│   ├── api/        # NestJS 백엔드 (포트 3100)
│   ├── crawler/    # BullMQ 크롤러
│   └── mobile/     # Expo 앱
├── docs/
│   └── design.md   # 설계 문서
├── docker-compose.yml
├── TODO.md
└── .env.example
```

---

## 빠른 시작

### 1. 환경변수 설정

```bash
cp .env.example apps/api/.env
cp .env.example apps/crawler/.env
# .env 파일에 실제 값 입력 (YOUTUBE_API_KEY, FIREBASE_*, JWT_SECRET 등)
```

### 2. 인프라 시작

```bash
docker compose up -d
# MongoDB :3101 / Elasticsearch :3102 / Redis :3103 / PostgreSQL :3104
```

### 3. API 서버

```bash
cd apps/api
npm install
npm run start:dev   # http://localhost:3100
```

### 4. 크롤러

```bash
cd apps/crawler
npm install
npm start           # 시작 즉시 + 15분 간격 반복
```

### 5. 모바일 앱

```bash
cd apps/mobile
npm install
npx expo start
```

---

## API 엔드포인트

### 콘텐츠
| Method | Path | 설명 |
|--------|------|------|
| GET | `/contents` | 검색 (`q`, `tags`, `source_type`, `page`, `limit`) |
| GET | `/contents/trending` | 인기 콘텐츠 (Redis ZSet) |
| GET | `/contents/autocomplete?q=` | 제목 자동완성 |
| GET | `/contents/:id` | 상세 조회 + 조회수 반영 |

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/signup` | 회원가입 → JWT 반환 |
| POST | `/auth/login` | 로그인 → JWT 반환 |

### 유저 (JWT 필요)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/users/me` | 프로필 + 구독 태그 |
| PUT | `/users/me/tags` | 구독 태그 설정 |
| PUT | `/users/me/fcm-token` | FCM 토큰 등록 |
| GET | `/users/me/bookmarks` | 북마크 목록 |
| POST | `/users/me/bookmarks/:id` | 북마크 추가 |
| DELETE | `/users/me/bookmarks/:id` | 북마크 삭제 |

### 이벤트 / 푸시
| Method | Path | 설명 |
|--------|------|------|
| POST | `/events` | 유저 이벤트 배치 수집 |
| GET | `/events/trends` | 태그/시간대별 트렌드 |
| POST | `/push/subscribe` | FCM 토큰 등록 |
| GET | `/metrics` | Prometheus 메트릭 (localhost only) |

---

## 크롤링 소스

| 타입 | 소스 | 방식 |
|------|------|------|
| 블로그 | dev.to | RSS (`rss-parser`) |
| YouTube | Fireship | YouTube Data API v3 |
| 채용공고 | 원티드 | cheerio HTML 스크래핑 |

소스 추가: `apps/crawler/src/config.ts`의 `blogSources`, `youtubeSources`, `jobSources` 배열에 추가.

---

## 환경변수

| 변수 | 설명 |
|------|------|
| `MONGODB_URI` | MongoDB 연결 URI |
| `ELASTICSEARCH_URL` | Elasticsearch URL |
| `REDIS_URL` | Redis URL |
| `DATABASE_URL` | PostgreSQL 연결 URL |
| `JWT_SECRET` | JWT 서명 키 (필수, 미설정 시 앱 시작 거부) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 |
| `GEMINI_API_KEY` | Gemini API 키 (영상 요약용, 선택) |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase 서비스 계정 이메일 |
| `FIREBASE_PRIVATE_KEY` | Firebase 서비스 계정 키 |
| `CORS_ORIGIN` | CORS 허용 오리진 (기본: `*`) |
| `NODE_ENV` | `production` 설정 시 TypeORM synchronize 비활성화 |
