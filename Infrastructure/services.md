# TechFeed Infrastructure Services

## Home Server

| Item | Value |
|------|-------|
| OS | Windows 10/11 |
| Hostname | DESKTOP-2AI7EKV |
| User | `ylswn` |
| SSH | `windows.nuclearbomb6518.com:2222` |
| SSH Key | `~/.ssh/deploy_windows` (local), `DEPLOY_SSH_KEY` (GitHub Secret, base64) |

```bash
# SSH 접속
ssh windows   # ~/.ssh/config 별칭 사용
```

---

## Cloudflare DDNS

IP가 바뀔 때마다 Cloudflare DNS A 레코드와 YouTube API 키 IP 제한을 자동 갱신.

| Item | Value |
|------|-------|
| Script | `C:\ddns.ps1` |
| Node helper | `C:\update-youtube-key.js` |
| SA JSON | `C:\techfeed-sa.json` |
| Scheduled Task | `\CloudflareDDNS` — 5분마다 실행 |
| Target DNS | `windows.nuclearbomb6518.com` (A record, proxied=false) |
| CF Zone ID | `74e0a570c566869e0ae10ad75705a12b` |
| CF Record ID | `2d52c5d24f01a08ee4855180bbf0aaa0` |

**동작 흐름:**
1. `api.ipify.org`로 현재 공인 IP 조회
2. Cloudflare DNS A 레코드 업데이트
3. `node C:\update-youtube-key.js <ip>` 실행
   - Firebase SA JSON으로 OAuth 토큰 발급
   - Google API Keys API `lookupKey`로 YouTube 키 리소스 조회
   - `serverKeyRestrictions.allowedIps`를 현재 IP로 업데이트

**Scheduled Task 재등록 (재설치 시):**
```powershell
schtasks /create /tn "CloudflareDDNS" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\ddns.ps1" /sc minute /mo 5 /ru ylswn
```

**Firebase SA 권한:**
- 서비스 계정: `firebase-adminsdk-fbsvc@tech-feed-c5474.iam.gserviceaccount.com`
- 필요 역할: `API Keys Admin` (`roles/apikeys.admin`)
- 프로젝트: `tech-feed-c5474`
- 필요 API: `apikeys.googleapis.com` (활성화 필요)

---

## Cloudflare Tunnel

Web 서비스 외부 노출용. SSH는 제외 (DDNS 직접 접근).

| Item | Value |
|------|-------|
| Config | `C:\Users\ylswn\.cloudflared\config.yml` |
| Tunnel ID | `df264487-79ac-4e52-aec9-4a2ca5c7b9ec` |

| Hostname | Service |
|----------|---------|
| `techfeed-api.nuclearbomb6518.com` | `localhost:3100` |
| `profile.nuclearbomb6518.com` | `localhost:3000` |
| `storybook.nuclearbomb6518.com` | `localhost:6006` |
| `lotto.nuclearbomb6518.com` | `localhost:3001` |
| `seobi.nuclearbomb6518.com` | `localhost:3002` |
| `monitoring-windows.nuclearbomb6518.com/node-exporter` | `localhost:9100` |
| `monitoring-windows.nuclearbomb6518.com/cadvisor` | `localhost:8080` |
| `monitoring-windows.nuclearbomb6518.com/pm2` | `localhost:9300` |

---

## PM2 Processes

| ID | Name | Port |
|----|------|------|
| 0 | profile-next | 3000 |
| 1 | storybook | 6006 |
| 11 | seobi-chat | 3002 |

---

## Mac Mini — DevOps Monitor

로컬 모니터링 스택 (Mac Mini에서 Docker Compose 실행).

**Deploy path:** `~/Documents/Work/Projects/devops-monitor`

| Container | 역할 | Port |
|-----------|------|------|
| `grafana` | 대시보드 UI | `3000` |
| `prometheus` | 메트릭 수집 | `9090` |
| `loki` | 로그 집계 | `3100` |
| `alertmanager` | 알림 라우팅 | `9093` |

**Slack 연동:**

| Item | Value |
|------|-------|
| Bot Token | `devops-monitor/.env` → `SLACK_BOT_TOKEN` |
| Webhook URL | `devops-monitor/.env` → `SLACK_WEBHOOK_URL` |
| 알림 채널 | `#새-워크스페이스-전체` (`C0AGQNN4Q2D`) |

APK 빌드 결과, Grafana 알림 등 모두 이 채널로 전송.

---

## TechFeed Docker Services

GitHub Actions (`deploy.yml`) — `main` push 또는 수동 실행 시 자동 배포.

**Deploy path:** `C:\Users\ylswn\Projects\techfeed`

| Container | Image | Port |
|-----------|-------|------|
| `techfeed-api` | `./apps/api` (Dockerfile) | `3100` |
| `techfeed-crawler` | `./apps/crawler` (Dockerfile) | — |
| `techfeed-mongodb` | `mongo:7` | `3101` |
| `techfeed-elasticsearch` | `elasticsearch:9.0.1` | `3102` |
| `techfeed-redis` | `redis:7-alpine` | `3103` |
| `techfeed-postgres` | `timescale/timescaledb:latest-pg15` | `3104` |

**GitHub Secrets:**

| Secret | 값 출처 |
|--------|---------|
| `DEPLOY_HOST` | `windows.nuclearbomb6518.com` |
| `DEPLOY_PORT` | `2222` |
| `DEPLOY_USER` | `ylswn` |
| `DEPLOY_SSH_KEY` | `base64 < ~/.ssh/deploy_windows` |
| `MONGODB_URI` | docker container name |
| `ELASTICSEARCH_URL` | docker container name |
| `REDIS_URL` | docker container name |
| `DATABASE_URL` | docker container name |
| `JWT_SECRET` | 임의 생성 |
| `CORS_ORIGIN` | 모바일 앱 번들 ID |
| `FIREBASE_PROJECT_ID` | `tech-feed-c5474` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK JSON |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK JSON (literal `\n`) |
| `YOUTUBE_API_KEY` | Google Cloud Console |
| `GEMINI_API_KEY` | Google AI Studio |
