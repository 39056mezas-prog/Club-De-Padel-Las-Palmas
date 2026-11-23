#!/usr/bin/env bash
# Serve the site with HTTP Range support (required for the scroll-scrubbed video).
# Usage:  ./serve-site.sh [port]       then open http://localhost:PORT
PORT="${1:-8080}"
DIR="$(cd "$(dirname "$0")" && pwd)/site"
if command -v npx >/dev/null 2>&1; then
  echo "Serving $DIR on http://localhost:$PORT"
  exec npx --yes serve "$DIR" -l "$PORT"
elif command -v php >/dev/null 2>&1; then
  echo "Serving $DIR on http://localhost:$PORT"
  exec php -S "localhost:$PORT" -t "$DIR"
else
  echo "Install Node (npx) or PHP. Do NOT use 'python -m http.server':"
  echo "it does not serve HTTP Range requests, so the video will not scrub."
  exit 1
fi
