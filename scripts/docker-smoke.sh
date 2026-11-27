#!/usr/bin/env bash
# Docker smoke test for the single-container image.
#  1. build the image
#  2. run it with a fresh named volume, save a book status + video position
#  3. remove the container, start a NEW container on the SAME volume
#  4. assert both values survived, check pages/SEO/assets, check clean SIGTERM shutdown
set -euo pipefail

IMAGE=${IMAGE:-reading-challenge-tracker:smoke}
VOLUME=rct-smoke-data-$$
NAME=rct-smoke-$$
PORT=${SMOKE_PORT:-3300}
BASE="http://127.0.0.1:${PORT}"

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; exit 1; }
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; docker volume rm -f "$VOLUME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

wait_healthy() {
  for _ in $(seq 1 60); do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo starting)
    [ "$status" = healthy ] && return 0
    sleep 1
  done
  docker logs "$NAME" | tail -30
  fail "container did not become healthy"
}

run_container() {
  docker run -d --name "$NAME" -p "${PORT}:3000" -v "${VOLUME}:/data" "$IMAGE" >/dev/null
  wait_healthy
}

echo "Building $IMAGE"
docker build -q -t "$IMAGE" . >/dev/null
pass "image built ($(docker image inspect -f '{{.Size}}' "$IMAGE" | awk '{printf "%.0f MB", $1/1024/1024}'))"

docker volume create "$VOLUME" >/dev/null
run_container
pass "container 1 healthy (HEALTHCHECK → /api/health through the public port)"
[ "$(docker ps --filter "name=$NAME" -q | wc -l | tr -d ' ')" = 1 ] && pass "one container runs both web and API"

books=$(curl -sf "$BASE/api/books")
echo "$books" | grep -q '"readCount":0' || fail "fresh database should start at 0 of 3"
pass "fresh database: both lists 0 of 3"

curl -sf -X PATCH "$BASE/api/books/matilda" -H 'content-type: application/json' -d '{"read":true}' | grep -q '"readCount":1' \
  || fail "PATCH matilda"
curl -sf -X PATCH "$BASE/api/books/matilda" -H 'content-type: application/json' -d '{"read":true}' | grep -q '"readCount":1' \
  || fail "repeated PATCH should be idempotent"
pass "marked Matilda read (twice, still 1 of 3)"
code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$BASE/api/books/nope" -H 'content-type: application/json' -d '{"read":true}')
[ "$code" = 404 ] && pass "unknown id → 404" || fail "unknown id gave $code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$BASE/api/books/matilda" -H 'content-type: application/json' -d '{"read":"false"}')
[ "$code" = 400 ] && pass "string status → 400" || fail "string status gave $code"
curl -sf -X PUT "$BASE/api/video-progress" -H 'content-type: application/json' -d '{"positionSeconds":12.3}' >/dev/null
pass "saved video position 12.3 s"

start=$(date +%s)
docker stop -t 15 "$NAME" >/dev/null
stopped=$(( $(date +%s) - start ))
exit_code=$(docker inspect -f '{{.State.ExitCode}}' "$NAME")
[ "$exit_code" = 0 ] && pass "SIGTERM shutdown exit 0 in ${stopped}s" || fail "shutdown exit code $exit_code"
docker logs "$NAME" 2>&1 | grep -q "shutting down" || fail "no graceful shutdown log"
docker rm "$NAME" >/dev/null
pass "container removed"

run_container
pass "container 2 healthy on the same volume"
curl -sf "$BASE/api/books" | python3 -c '
import json,sys
d={l["id"]:l for l in json.load(sys.stdin)["lists"]}
assert d["fiction"]["readCount"]==1 and d["nonfiction"]["readCount"]==0, d
assert [b for b in d["fiction"]["books"] if b["id"]=="matilda"][0]["read"] is True
' && pass "book status survived: Fiction 1 of 3, Nonfiction 0 of 3"
curl -sf "$BASE/api/video-progress" | grep -q '"positionSeconds":12.3' && pass "video position survived: 12.3 s" || fail "video position lost"
curl -sf "$BASE/api/rewards" | grep -q '"id":"challenge-tote"' && pass "rewards endpoint served through the public port" || fail "rewards endpoint"

html=$(curl -sf "$BASE/")
echo "$html" | grep -q '<title>Your reading challenge · Lantern Lane Library</title>' && pass "page renders with title"
echo "$html" | grep -q 'property="og:image"' && pass "Open Graph tags present"
[ "$(curl -s -o /dev/null -w '%{content_type}' "$BASE/og-image.png")" = image/png ] && pass "og-image.png served"
curl -sf "$BASE/robots.txt" | grep -q 'Disallow: /api/' && pass "robots.txt"
curl -sf "$BASE/sitemap.xml" | grep -q '<loc>' && pass "sitemap.xml"
[ "$(curl -sf "$BASE/downloads/the-secret-garden-chapter-1.pdf" | head -c 5)" = "%PDF-" ] && pass "sample PDF is a real PDF"
[ "$(curl -s -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-1023' "$BASE/media/welcome.mp4")" = 206 ] && pass "video served with range requests"
[ "$(curl -sI "$BASE/api/books" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')" = no-store ] && pass "API responses are no-store"

echo "Docker smoke test passed."
