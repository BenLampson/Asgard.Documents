#!/usr/bin/env bash
set -euo pipefail

base="/root/deploy/nginx/wwwroot/asgard.benlampson.cn"
ln -sfn "releases/20260716-220214" "${base}/current.next"
mv -Tf "${base}/current.next" "${base}/current"
readlink "${base}/current"
docker exec nginx test -f /usr/share/nginx/wwwroot/asgard.benlampson.cn/current/index.html
docker exec nginx nginx -t
