# TechFeed

개발자를 위한 콘텐츠 큐레이션 앱. 테크 블로그 · YouTube · 채용공고를 한 곳에서.

---

## 주요 기능

- **피드** — 블로그 RSS, YouTube 채널, 채용공고 자동 수집 (15분 간격)
- **AI 요약** — Gemini 2.5 Flash 기반 블로그/유튜브/채용공고 요약 (Redis 7일 캐시)
- **검색** — Elasticsearch 전문 검색 + 태그/소스 필터링 + 자동완성
- **맞춤 피드** — 구독 태그 기반 개인화 추천 (비로그인 시 최신순 fallback)
- **랭킹** — Redis Sorted Set 기반 시간 감쇠 트렌딩
- **댓글** — 콘텐츠 상세 화면에서 댓글 작성/삭제
- **북마크** — 관심 콘텐츠 저장
- **푸시 알림** — 구독 태그에 새 콘텐츠 등록 시 FCM 즉시 푸시
- **구독 태그** — DB 기반 태그 목록 (`GET /tags`) — 앱 재빌드 없이 태그 추가/제거 가능
- **이벤트 분석** — TimescaleDB 기반 유저 행동 시계열 저장
- **테마** — 다크 / 라이트 모드 지원

---

## 기술 스택

| 역할 | 기술 |
|------|------|
| 모바일 앱 | Expo (React Native) |
| 백엔드 API | NestJS (TypeScript) |
| 원본 저장 | MongoDB |
| 전문 검색 | Elasticsearch |
| 캐시 / 랭킹 | Redis |
| 유저 / 북마크 / 태그 | PostgreSQL + TypeORM |
| 시계열 이벤트 | TimescaleDB |
| AI 요약 | Google Gemini 2.5 Flash |
| 푸시 알림 | FCM (firebase-admin) |
| 크롤러 큐 | BullMQ |
| 인프라 | Docker Compose + GitHub Actions |

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
└── .env.example
```

---

## 빠른 시작

### 1. 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 실제 값 입력 (YOUTUBE_API_KEY, FIREBASE_*, JWT_SECRET, GEMINI_API_KEY 등)
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
| GET | `/contents/recommended` | 맞춤 추천 (JWT 선택, 구독 태그 기반) |
| GET | `/contents/autocomplete?q=` | 제목 자동완성 |
| GET | `/contents/:id` | 상세 조회 + 조회수 반영 |
| GET | `/contents/:id/summary` | AI 요약 (Gemini, Redis 캐시) |

### 태그
| Method | Path | 설명 |
|--------|------|------|
| GET | `/tags` | 구독 가능한 태그 목록 (DB 관리) |

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/signup` | 이메일 회원가입 → JWT 반환 |
| POST | `/auth/login` | 이메일 로그인 → JWT 반환 |
| POST | `/auth/google` | Google OAuth 로그인 → JWT 반환 |

### 유저 (JWT 필요)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/users/me` | 프로필 + 구독 태그 |
| PUT | `/users/me/tags` | 구독 태그 설정 |
| GET | `/users/me/bookmarks` | 북마크 목록 |
| POST | `/users/me/bookmarks/:id` | 북마크 추가 |
| DELETE | `/users/me/bookmarks/:id` | 북마크 삭제 |
| GET | `/users/me/stats` | 독서 통계 (주간/전체 읽음, 연속 읽기, 태그 분포) |
| GET | `/users/me/preferences` | 알림 채널 설정 조회 |
| PATCH | `/users/me/preferences` | 알림 채널 설정 변경 |

### 댓글 (JWT 필요)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/contents/:id/comments` | 댓글 목록 |
| POST | `/contents/:id/comments` | 댓글 작성 |
| DELETE | `/contents/:id/comments/:commentId` | 댓글 삭제 |

### 이벤트 / 푸시 / 메트릭
| Method | Path | 설명 |
|--------|------|------|
| POST | `/events` | 유저 이벤트 배치 수집 |
| GET | `/events/trends` | 태그/시간대별 트렌드 |
| POST | `/push/subscribe` | FCM 토큰 등록 |
| DELETE | `/push/token` | FCM 토큰 삭제 |
| GET | `/metrics` | Prometheus 메트릭 (localhost only) |

---

## 크롤링 소스

### 블로그 (RSS)
| 소스 | 태그 |
|------|------|
| 네이버 D2 | naver |
| 카카오 Tech | kakao |
| 카카오페이 Tech | kakao, fintech |
| 카카오뱅크 Tech | kakao, fintech |
| 우아한형제들 | baemin |
| 당근 | daangn |
| 올리브영 Tech | oliveyoung |
| LINE Engineering | line |
| 토스 Tech | toss, fintech |
| 쿠팡 Engineering | coupang |
| 컬리 Tech | kurly |
| 현대자동차 Tech | hyundai |
| 라인플러스 Tech | line |
| 뱅크샐러드 Tech | banksalad, fintech |
| 무신사 Tech | musinsa |
| Velog 트렌딩 | velog (한국어 + 기술 키워드 필터) |
| 요즘IT | news |

### YouTube
| 채널 | 태그 |
|------|------|
| 코딩애플 | webdev, javascript |
| 노마드 코더 | webdev, react |
| 드림코딩 | webdev, javascript |
| 우아한Tech | baemin, backend |
| NAVER D2 | naver |

### 채용공고
| 소스 | 방식 |
|------|------|
| 원티드 | 공개 API |
| 점핏 | 공개 API |

> 동일 공고 중복 방지: `sha256(회사명 + 직무명)` 기반 `position_hash` 중복 체크

소스 추가: `apps/crawler/src/config.ts`의 `blogSources`, `youtubeSources`, `jobSources` 배열에 추가.

---

## 구독 태그 관리

태그 목록은 PostgreSQL `subscription_tags` 테이블에서 관리됩니다.
앱/서버 재배포 없이 DB에서 직접 추가/제거할 수 있습니다.

```sql
-- 태그 추가
INSERT INTO subscription_tags (name, sort_order) VALUES ('elixir', 22);

-- 태그 제거
DELETE FROM subscription_tags WHERE name = 'elixir';
```

---

## 환경변수

| 변수 | 설명 |
|------|------|
| `MONGODB_URI` | MongoDB 연결 URI |
| `ELASTICSEARCH_URL` | Elasticsearch URL |
| `REDIS_URL` | Redis URL |
| `DATABASE_URL` | PostgreSQL 연결 URL |
| `JWT_SECRET` | JWT 서명 키 (필수) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 |
| `GEMINI_API_KEY` | Gemini API 키 (AI 요약용) |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase 서비스 계정 이메일 |
| `FIREBASE_PRIVATE_KEY` | Firebase 서비스 계정 키 |
| `CORS_ORIGIN` | CORS 허용 오리진 (기본: `*`) |
| `NODE_ENV` | `production` 설정 시 TypeORM synchronize 비활성화 |
