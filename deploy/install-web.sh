#!/usr/bin/env bash
# Task Flow Web 서버(Nginx) 설치·갱신 스크립트(A안: 한 컴퓨터에서 역할 분리).
# 실행: 프로젝트 루트에서 sudo bash deploy/install-web.sh
# 다시 실행하면 화면 파일과 Nginx 설정을 갱신한다. App 서버(T13)가 먼저 설치되어 있어야 한다.
set -euo pipefail

WEB_ROOT=/var/www/task-flow
SITE_NAME=task-flow.conf
SITE_AVAILABLE=/etc/nginx/sites-available/$SITE_NAME
SITE_ENABLED=/etc/nginx/sites-enabled/$SITE_NAME
SRC_DIR=$(cd "$(dirname "$0")/.." && pwd)

if [[ $EUID -ne 0 ]]; then
  echo "sudo로 실행해 주세요: sudo bash deploy/install-web.sh" >&2
  exit 1
fi
if ! systemctl is-active --quiet task-flow-api; then
  echo "App 서버(task-flow-api)가 실행 중이 아닙니다. 먼저 sudo bash deploy/install-app.sh를 실행해 주세요." >&2
  exit 1
fi

echo "[1/5] Nginx 설치 확인"
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx >/dev/null
fi
nginx -v

echo "[2/5] 화면 파일 복사 → $WEB_ROOT"
install -d -m 755 "$WEB_ROOT"
rsync -a --delete --chown=root:root --chmod=D755,F644 "$SRC_DIR/frontend/" "$WEB_ROOT/"

echo "[3/5] Nginx 사이트 설정 → $SITE_AVAILABLE"
install -m 644 "$SRC_DIR/deploy/nginx-task-flow.conf" "$SITE_AVAILABLE"
ln -sfn "$SITE_AVAILABLE" "$SITE_ENABLED"
# 설치 시 함께 켜지는 기본 안내 페이지를 끈다(설정 파일은 sites-available에 남아 있어 되돌릴 수 있다).
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm /etc/nginx/sites-enabled/default
fi

echo "[4/5] 설정 검사 후 적용"
nginx -t
systemctl enable nginx >/dev/null
if systemctl is-active --quiet nginx; then
  systemctl reload nginx
else
  systemctl start nginx
fi

echo "[5/5] 상태 확인"
# reload는 기다리지 않고 끝나므로, 새 설정의 응답(/api/health)이 올 때까지 잠시 기다린다.
for _ in $(seq 20); do
  if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
systemctl --no-pager --lines=0 status nginx || true
echo
echo "화면: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
echo "health: $(curl -sS http://127.0.0.1/api/health || echo '응답 없음')"
