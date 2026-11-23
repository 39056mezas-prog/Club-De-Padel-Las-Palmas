#!/usr/bin/env bash
# Local preview with HTTP Range support (needed for the scroll-scrubbed video).
# Vercel handles this for you in production — this is only for previewing locally.
PORT="${1:-8080}"
DIR="$(cd "$(dirname "$0")" && pwd)"
if command -v npx >/dev/null 2>&1; then
  exec npx --yes serve "$DIR" -l "$PORT"
elif command -v php >/dev/null 2>&1; then
  exec php -S "localhost:$PORT" -t "$DIR"
else
  echo "Install Node or PHP. Do NOT use 'python -m http.server' —"
  echo "it does not serve Range requests, so the video will not scrub."
  exit 1
fi
