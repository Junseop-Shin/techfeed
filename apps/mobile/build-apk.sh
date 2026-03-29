#!/bin/bash
set -e

export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 Building APK via EAS local build..."
npx eas build --platform android --profile preview --local --output "$SCRIPT_DIR/build-output.apk"

APK_PATH="$SCRIPT_DIR/build-output.apk"
if [ ! -f "$APK_PATH" ]; then
  echo "❌ APK not found"
  exit 1
fi

APK_SIZE=$(du -sh "$APK_PATH" | cut -f1)
echo "✅ Build complete — $APK_SIZE"

echo "📤 Slack으로 APK 전송 중..."
SLACK_BOT_TOKEN=$(grep "SLACK_BOT_TOKEN" ~/Documents/Work/Projects/devops-monitor/.env | cut -d'=' -f2-)
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
FILE_SIZE=$(wc -c < "$APK_PATH" | tr -d ' ')
FILENAME="techfeed-${COMMIT}.apk"

# Step 1: 업로드 URL 받기
UPLOAD_RESP=$(curl -s -X POST "https://slack.com/api/files.getUploadURLExternal" \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "filename=${FILENAME}&length=${FILE_SIZE}")

UPLOAD_URL=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])")
FILE_ID=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['file_id'])")

# Step 2: 파일 업로드
curl -s -X POST "$UPLOAD_URL" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$APK_PATH" > /dev/null

# Step 3: 업로드 완료 + 채널 공유
curl -s -X POST "https://slack.com/api/files.completeUploadExternal" \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"files\":[{\"id\":\"${FILE_ID}\",\"title\":\"${FILENAME}\"}],\"channel_id\":\"C0AGQNN4Q2D\"}" > /dev/null

# Step 4: 채널에 메시지 전송
FILE_URL="https://files.slack.com/files-pri/T0AG8CP8ASZ-${FILE_ID}/${FILENAME}"
curl -s -X POST "https://slack.com/api/chat.postMessage" \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"C0AGQNN4Q2D\",\"text\":\"📦 [techfeed] Android APK 빌드 완료 (${COMMIT}) — 크기: ${APK_SIZE}\",\"attachments\":[{\"text\":\"<${FILE_URL}|${FILENAME} 다운로드>\"}]}" > /dev/null

echo "✅ Slack APK 전송 완료"
