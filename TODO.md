# TechFeed — TODO

코드 리뷰 후 남은 개선 항목. 데이터가 충분히 쌓인 후 성능 이슈 확인 시 처리.

---

## 🟡 Medium

- [ ] **Notifications N+1 쿼리 개선**
  - `notifications.service.ts` — 태그 루프마다 `findByTag()` 개별 호출
  - Fix: `WHERE tag IN (...)` 단일 쿼리로 교체

- [ ] **activeUsersGauge DB 부하**
  - `metrics.service.ts` — Prometheus 스크래핑마다 `COUNT(DISTINCT user_id)` 실행
  - Fix: TimescaleDB continuous aggregate 또는 Redis 카운터로 교체

- [ ] **incrementViewCount 비원자적 연산**
  - `cache.service.ts` — `zscore → zadd` 2번 round-trip
  - Fix: Lua 스크립트로 원자적 처리

- [ ] **Job 크롤러 취약성**
  - `job.crawler.ts` — CSS 선택자 기반 스크래핑, 사이트 변경 시 무음 실패
  - Fix: 0건 반환 시 알림/헬스체크 추가

- [ ] **Content 스키마 중복**
  - `api`와 `crawler` 양쪽에 Content 스키마 + `hashUrl` 존재
  - Fix: `libs/shared` 패키지로 분리 (모노레포 구성 시)

- [ ] **TypeORM migration 도입**
  - 현재 개발 환경 `synchronize: true` 사용 중
  - Fix: migration 파일 생성 + `synchronize: false` 전환

---

## 🟢 Low

- [ ] **Elasticsearch analyzer 한국어 지원**
  - `search.service.ts` — title 필드 `english` analyzer 고정
  - Fix: nori (한국어) analyzer 적용 검토

- [ ] **@Unique 컬럼명 수정**
  - `bookmark.entity.ts` — `@Unique(['user', 'content_id'])` 관계 프로퍼티명 사용
  - Fix: `@Unique(['userId', 'content_id'])` 또는 DB 인덱스 직접 확인

- [ ] **DTO 분리**
  - `push.controller.ts`, `users.controller.ts` 내 인라인 DTO 클래스
  - Fix: 별도 `dto/` 파일로 분리

---

## 🚀 기능 추가 (백로그)

- [ ] Gemini 요약 lazy 실행 구현 (`GET /contents/:id/summary`)
- [ ] YouTube PubSubHubbub Webhook (폴링 대신 실시간)
- [ ] Elasticsearch ILM — 90일 이상 콘텐츠 cold 티어 이동
- [ ] FCM 토큰 만료 자동 정리
- [ ] devops-monitor Grafana 연동 (`/metrics` → Prometheus scrape)
- [ ] Expo EAS Build 설정 (TestFlight / Play Console 배포)
