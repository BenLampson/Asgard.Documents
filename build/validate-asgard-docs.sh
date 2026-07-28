#!/usr/bin/env bash
set -euo pipefail

domain="asgard.benlampson.cn"
paths=(
    "/"
    "/zh"
    "/en"
    "/zh/asgard"
    "/en/heimdall"
    "/zh/skills"
    "/en/asgard/docs/cors-operations"
    "/search-index.json"
    "/llms.txt"
    "/llms-full.txt"
    "/sitemap.xml"
    "/robots.txt"
    "/en/asgard/docs/cors-operations/index.html.md"
    "/definitely-missing"
)

for path in "${paths[@]}"; do
    result="$(curl \
        --resolve "${domain}:443:127.0.0.1" \
        --silent \
        --show-error \
        --output /tmp/asgard-docs-body \
        --write-out "%{http_code}|%{content_type}|%{size_download}|%{redirect_url}" \
        "https://${domain}${path}")"
    printf '%s|%s\n' "$result" "$path"
done

printf '%s\n' "--- http"
curl \
    --resolve "${domain}:80:127.0.0.1" \
    --silent \
    --show-error \
    --output /dev/null \
    --write-out "%{http_code}|%{redirect_url}\n" \
    "http://${domain}/"

printf '%s\n' "--- search count"
python3 - <<'PY'
import json

with open('/root/deploy/nginx/wwwroot/asgard.benlampson.cn/current/search-index.json', encoding='utf-8') as source:
    print(len(json.load(source)['entries']))
PY
