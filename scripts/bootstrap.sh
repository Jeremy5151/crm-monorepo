#!/usr/bin/env bash
#
# One-shot bootstrapper for deploying the CRM on a fresh server.
#
# Usage:
#   scripts/bootstrap.sh \
#     --admin-email admin@example.com \
#     --admin-pass changeme123 \
#     [--admin-name "Super Admin"] \
#     [--api-domain api.example.com] \
#     [--web-domain crm.example.com] \
#     [--postgres-port 5432] \
#     [--api-port 3001] \
#     [--web-port 3000]
#
# If domains are provided, NEXT_PUBLIC_API_BASE will use https://DOMAIN.
# Otherwise, defaults to http://127.0.0.1:API_PORT.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ADMIN_EMAIL="admin@example.com"
ADMIN_PASS="changeme123"
ADMIN_NAME="Super Admin"
API_DOMAIN=""
WEB_DOMAIN=""
POSTGRES_PORT="5432"
API_PORT="3001"
WEB_PORT="3000"

usage() {
  sed -n '1,40p' "$0"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin-email)
      ADMIN_EMAIL="${2:-}"; shift 2 ;;
    --admin-pass)
      ADMIN_PASS="${2:-}"; shift 2 ;;
    --admin-name)
      ADMIN_NAME="${2:-}"; shift 2 ;;
    --api-domain)
      API_DOMAIN="${2:-}"; shift 2 ;;
    --web-domain)
      WEB_DOMAIN="${2:-}"; shift 2 ;;
    --postgres-port)
      POSTGRES_PORT="${2:-}"; shift 2 ;;
    --api-port)
      API_PORT="${2:-}"; shift 2 ;;
    --web-port)
      WEB_PORT="${2:-}"; shift 2 ;;
    -h|--help)
      usage ;;
    *)
      echo "Unknown option: $1" >&2
      usage ;;
  esac
done

for var in "$ADMIN_EMAIL" "$ADMIN_PASS" "$ADMIN_NAME"; do
  if [[ "$var" == *"'"* ]]; then
    echo "Inputs must not contain single quotes: $var" >&2
    exit 1
  fi
done

log() {
  printf "\033[32m==>\033[0m %s\n" "$*"
}

cd "$ROOT_DIR"

log "Ensuring pnpm dependencies are installed"
pnpm install --no-frozen-lockfile

API_BASE="http://127.0.0.1:${API_PORT}"
if [[ -n "$API_DOMAIN" ]]; then
  API_BASE="https://${API_DOMAIN}"
fi

log "Writing apps/api/.env"
cat > apps/api/.env <<EOF
DATABASE_URL="postgresql://crm:crm@127.0.0.1:${POSTGRES_PORT}/crm?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
NODE_ENV="production"
EOF

log "Writing apps/web/.env"
cat > apps/web/.env <<EOF
NEXT_PUBLIC_API_BASE="${API_BASE}"
NODE_ENV="production"
EOF

log "Starting database and cache with Docker Compose"
docker compose up -d

POSTGRES_CONT=$(docker compose ps -q postgres || true)
if [[ -z "$POSTGRES_CONT" ]]; then
  echo "Postgres container is not running. Check docker compose logs." >&2
  exit 1
fi

log "Waiting for Postgres to accept connections"
RETRIES=30
until docker exec "$POSTGRES_CONT" pg_isready -U crm -d crm -h 127.0.0.1 >/dev/null 2>&1; do
  ((RETRIES--))
  if (( RETRIES == 0 )); then
    echo "Postgres did not become ready in time." >&2
    exit 1
  fi
  sleep 2
done

log "Synchronising database schema via prisma db push"
(
  cd apps/api
  pnpm prisma db push
  pnpm prisma generate
)

log "Upserting SUPERADMIN user (${ADMIN_EMAIL})"
docker exec -i "$POSTGRES_CONT" psql -U crm -d crm <<SQL
INSERT INTO "users" (
  id, email, name, password, role, "isActive", "apiKey",
  timezone, language, theme, "accentColor", "createdAt", "updatedAt"
)
VALUES (
  concat('user_', substr(md5(random()::text), 1, 24)),
  '${ADMIN_EMAIL}',
  '${ADMIN_NAME}',
  '${ADMIN_PASS}',
  'SUPERADMIN',
  true,
  concat('key_', extract(epoch from now())::bigint, '_', substr(md5(random()::text), 1, 8)),
  'UTC',
  'en',
  'light',
  '#FFD666',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET
  role='SUPERADMIN',
  "isActive"=true,
  password='${ADMIN_PASS}',
  "updatedAt"=NOW();
SQL

log "Building API application"
(
  cd apps/api
  pnpm build
)

log "Building Web application"
(
  cd apps/web
  pnpm build
)

log "Starting API with pm2"
pm2 start "node dist/main.js" --name crm-api --cwd "$ROOT_DIR/apps/api" --env production --update-env || pm2 restart crm-api --update-env

log "Starting Web with pm2"
pm2 start "pnpm start -p ${WEB_PORT}" --name crm-web --cwd "$ROOT_DIR/apps/web" --env production --update-env || pm2 restart crm-web --update-env

log "Saving pm2 process list"
pm2 save

log "Bootstrap complete."
echo ""
echo "Admin credentials:"
echo "  Email:    ${ADMIN_EMAIL}"
echo "  Password: ${ADMIN_PASS}"
echo ""
echo "API is available on http://127.0.0.1:${API_PORT} (or https://${API_DOMAIN} if reverse proxy is configured)."
echo "Web UI is served on http://127.0.0.1:${WEB_PORT}."

