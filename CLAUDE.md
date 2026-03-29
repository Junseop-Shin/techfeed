# CLAUDE.md — TechFeed Project Guidelines

## Android APK 빌드

**항상 스크립트를 사용할 것. CLI로 직접 빌드하지 말 것.**

```bash
cd apps/mobile
bash build-apk.sh
```

스크립트가 자동으로:
1. `expo prebuild --platform android --clean` 실행
2. foojay-resolver-convention 버전 패치 (0.9.0)
3. `./gradlew assembleRelease` 빌드
4. Slack `#새-워크스페이스-전체` 채널로 APK 파일 직접 전송

> 서명 키: EAS 키스토어 사용 (Google OAuth 호환). debug 키로 빌드하면 구글 로그인 깨짐.

---

## 크롤링 소스 추가

YouTube 채널, 블로그 RSS 소스는 MongoDB `crawlersources` 컬렉션에서 관리:

```bash
docker exec -it techfeed-mongodb mongosh techfeed
db.crawlersources.insertOne({ type: 'youtube', name: '채널명', channelId: 'UCxxx', tags: ['tag1'], enabled: true })
```

---

## 서비스 구조

- API: `apps/api` (NestJS, port 3100)
- Crawler: `apps/crawler` (BullMQ)
- Mobile: `apps/mobile` (Expo)
- Infrastructure: `Infrastructure/` 디렉토리 참조
