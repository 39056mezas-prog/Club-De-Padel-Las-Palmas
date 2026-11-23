#!/usr/bin/env bash
# Point the SEO tags at your real domain. Run once after you know the URL:
#   ./set-domain.sh laspalmaspadel.com
set -e
D="${1:-}"
[ -z "$D" ] && { echo "usage: ./set-domain.sh your-domain.com"; exit 1; }
D="${D#http://}"; D="${D#https://}"; D="${D%/}"
cd "$(dirname "$0")"
grep -rl 'REPLACE-WITH-YOUR-DOMAIN' --include='*.html' --include='*.xml' --include='*.txt' . \
  | xargs sed -i.bak "s|REPLACE-WITH-YOUR-DOMAIN|$D|g"
find . -name '*.bak' -delete
echo "Done — canonical, Open Graph, sitemap and JSON-LD now point at https://$D"
