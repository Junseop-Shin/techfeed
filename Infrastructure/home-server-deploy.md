# Home Server Deployment

## Server Info

| Item | Value |
|------|-------|
| OS | Windows 10/11 |
| Hostname | DESKTOP-2AI7EKV |
| User | ylswn |
| SSH | `windows.nuclearbomb6518.com:2222` |
| SSH Key | `~/.ssh/deploy_windows` (local), `DEPLOY_SSH_KEY` (GitHub secret, base64 encoded) |

## SSH Access

```bash
ssh windows   # uses ~/.ssh/config alias
```

`~/.ssh/config` entry:
```
Host windows
  HostName windows.nuclearbomb6518.com
  User ylswn
  Port 2222
  IdentityFile ~/.ssh/deploy_windows
```

> Cloudflare Tunnel does not support SSH — direct IP access via DDNS.

---

## Cloudflare DDNS

Windows Scheduled Task으로 5분마다 공인 IP를 Cloudflare DNS에 업데이트.

- **Task name:** `\CloudflareDDNS`
- **Schedule:** Every 5 minutes
- **Script:** `C:\ddns.ps1`
- **Target record:** `windows.nuclearbomb6518.com` (A record, proxied=false)

### ddns.ps1 구조

```powershell
# 현재 공인 IP 조회
$currentIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content.Trim()

# Cloudflare DNS A 레코드 업데이트
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records/{recordId}" `
  -Method PUT `
  -Headers @{ "Authorization" = "Bearer {apiToken}"; "Content-Type" = "application/json" } `
  -Body "{...}"
```

### Scheduled Task 재등록 (재설치 시)

```powershell
schtasks /create /tn "CloudflareDDNS" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\ddns.ps1" /sc minute /mo 5 /ru ylswn
```

---

## Cloudflare Tunnel

Web 서비스는 Cloudflare Tunnel(`cloudflared`)로 노출. SSH는 제외.

- **Config:** `C:\Users\ylswn\.cloudflared\config.yml`
- **Tunnel ID:** `df264487-79ac-4e52-aec9-4a2ca5c7b9ec`

| Hostname | Service |
|----------|---------|
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

## TechFeed Deployment

GitHub Actions (`deploy.yml`) — push to `main` or manual dispatch.

**Deploy path:** `C:\Users\ylswn\Projects\techfeed`

**Steps:**
1. SSH key setup (base64 decoded)
2. `.env` 생성 (runner에서 생성 후 SCP 전송)
3. Source sync via `tar | ssh`
4. `docker compose up -d --build`

**GitHub Secrets:**

| Secret | Value Source |
|--------|-------------|
| `DEPLOY_HOST` | `windows.nuclearbomb6518.com` |
| `DEPLOY_PORT` | `2222` |
| `DEPLOY_USER` | `ylswn` |
| `DEPLOY_SSH_KEY` | `base64 < ~/.ssh/deploy_windows` |
| `MONGODB_URI` | docker-compose container name |
| `ELASTICSEARCH_URL` | docker-compose container name |
| `REDIS_URL` | docker-compose container name |
| `DATABASE_URL` | docker-compose container name |
| `FIREBASE_PROJECT_ID` | `tech-feed-c5474` |
| `FIREBASE_CLIENT_EMAIL` | firebase adminsdk json |
| `FIREBASE_PRIVATE_KEY` | firebase adminsdk json |
| `YOUTUBE_API_KEY` | Google Cloud Console |
| `GEMINI_API_KEY` | Google AI Studio |
