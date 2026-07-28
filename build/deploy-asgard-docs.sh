#!/usr/bin/env bash
set -euo pipefail

release_id="$1"
archive_path="$2"
staged_config="$3"

domain="asgard.benlampson.cn"
base="/root/deploy/nginx/wwwroot/${domain}"
release_dir="${base}/releases/${release_id}"
current_link="${base}/current"
config_path="/root/deploy/nginx/conf/${domain}.conf"
backup_dir="/root/deploy/nginx/backups"
backup_config="${backup_dir}/${domain}.conf.${release_id}.bak"
previous_target=""
next_target="releases/${release_id}"
had_config="false"

mkdir -p "$release_dir" "$backup_dir"
tar -xzf "$archive_path" -C "$release_dir"

test -f "${release_dir}/index.html"
test -f "${release_dir}/search-index.json"
test -f "${release_dir}/llms.txt"
test -f "${release_dir}/sitemap.xml"
test -f "${release_dir}/en/asgard/docs/cors-operations/index.html"
test -f "${release_dir}/en/asgard/docs/cors-operations/index.html.md"

find "$release_dir" -type d -exec chmod 755 {} +
find "$release_dir" -type f -exec chmod 644 {} +

if [ -L "$current_link" ]; then
    previous_target="$(readlink "$current_link")"
fi

if [ -f "$config_path" ]; then
    had_config="true"
    cp -a "$config_path" "$backup_config"
fi

rollback() {
    if [ -n "$previous_target" ]; then
        ln -sfn "$previous_target" "${current_link}.rollback"
        mv -Tf "${current_link}.rollback" "$current_link"
    else
        rm -f "$current_link"
    fi

    if [ "$had_config" = "true" ]; then
        cp -a "$backup_config" "$config_path"
    else
        rm -f "$config_path"
    fi

    docker exec nginx nginx -t >/dev/null 2>&1 && docker exec nginx nginx -s reload >/dev/null 2>&1 || true
}

ln -sfn "$next_target" "${current_link}.next"
mv -Tf "${current_link}.next" "$current_link"
cp "$staged_config" "$config_path"
chmod 644 "$config_path"

if ! docker exec nginx nginx -t; then
    rollback
    exit 1
fi

if ! docker exec nginx nginx -s reload; then
    rollback
    exit 1
fi

rm -f "$archive_path" "$staged_config"
printf '%s\n' "$release_dir"
