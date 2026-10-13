#!/usr/bin/env bash
# Task Flow App 서버 설치·갱신 스크립트(A안: 한 컴퓨터에서 역할 분리).
# 실행: 프로젝트 루트에서 sudo bash deploy/install-app.sh
# 다시 실행하면 코드·패키지·환경 변수를 갱신하고 서비스를 재시작한다. DB 데이터는 건드리지 않는다.
set -euo pipefail

APP_USER=taskflow
APP_ROOT=/opt/task-flow
APP_DIR=$APP_ROOT/app
VENV_DIR=$APP_ROOT/venv
ENV_DIR=/etc/task-flow
ENV_FILE=$ENV_DIR/task-flow.env
SERVICE=task-flow-api
SRC_DIR=$(cd "$(dirname "$0")/.." && pwd)

if [[ $EUID -ne 0 ]]; then
  echo "sudo로 실행해 주세요: sudo bash deploy/install-app.sh" >&2
  exit 1
fi
if [[ ! -f $SRC_DIR/.env ]]; then
  echo "$SRC_DIR/.env가 없습니다. .env.example을 참고해 먼저 만들어 주세요." >&2
  exit 1
fi

echo "[1/6] 실행 계정 $APP_USER 확인"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_ROOT" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
fi

echo "[2/6] 코드 복사 → $APP_DIR"
install -d -m 755 "$APP_ROOT" "$APP_DIR"
rsync -a --delete --exclude '__pycache__' "$SRC_DIR/backend" "$APP_DIR/"
install -m 644 "$SRC_DIR/requirements.txt" "$APP_DIR/requirements.txt"

echo "[3/6] 가상환경·패키지 설치 → $VENV_DIR"
if [[ ! -x $VENV_DIR/bin/python ]]; then
  python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/pip" install --quiet --disable-pip-version-check -r "$APP_DIR/requirements.txt"

echo "[4/6] 환경 변수 → $ENV_FILE (root:$APP_USER, 640)"
install -d -m 750 -o root -g "$APP_USER" "$ENV_DIR"
install -m 640 -o root -g "$APP_USER" "$SRC_DIR/.env" "$ENV_FILE"

# 코드와 가상환경은 root 소유로 두어 실행 계정이 수정할 수 없게 한다(읽기·실행만 가능).
chown -R root:root "$APP_ROOT"
chmod -R go-w "$APP_ROOT"

echo "[5/6] systemd 서비스 등록 → /etc/systemd/system/$SERVICE.service"
install -m 644 "$SRC_DIR/deploy/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"

echo "[6/6] 상태 확인"
for _ in $(seq 20); do
  if curl -fsS http://127.0.0.1:8001/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
systemctl --no-pager --lines=5 status "$SERVICE" || true
echo
echo "health: $(curl -sS http://127.0.0.1:8001/api/health || echo '응답 없음')"
