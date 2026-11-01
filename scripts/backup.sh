#!/usr/bin/env bash
# Nightly backup: pg_dump (through podman exec) plus a tar.gz of the images folder,
# written to a dated folder outside the repository, then old backups are pruned.
#
# Env (all optional): BACKUP_DIR (default ~/flipside-backups), RETENTION_DAYS (14),
# IMAGE_STORE_PATH (./data/images), PG_CONTAINER (flipside-postgres),
# PG_USER (flipside), PG_DB (flipside).
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
backup_dir="${BACKUP_DIR:-$HOME/flipside-backups}"
retention="${RETENTION_DAYS:-14}"
images="${IMAGE_STORE_PATH:-$repo/data/images}"
container="${PG_CONTAINER:-flipside-postgres}"
pg_user="${PG_USER:-flipside}"
pg_db="${PG_DB:-flipside}"

mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd -P)"
case "$backup_dir/" in
  "$repo"/*) echo "backup: BACKUP_DIR must be outside the repository" >&2; exit 2 ;;
esac
[ -d "$images" ] || { echo "backup: images folder not found: $images" >&2; exit 2; }

name="flipside-$(date +%Y-%m-%d-%H%M%S)"
final="$backup_dir/$name"
# Work in a hidden folder and rename at the end, so a folder with a final name is always complete.
partial="$backup_dir/.partial-$name"
trap 'rm -rf "$partial"' EXIT

mkdir "$partial"
podman exec "$container" pg_dump -U "$pg_user" -d "$pg_db" --format=custom > "$partial/database.dump"
[ -s "$partial/database.dump" ] || { echo "backup: empty database dump" >&2; exit 1; }
tar -czf "$partial/images.tar.gz" -C "$images" .
mv "$partial" "$final"

# Retention runs only after a successful backup and only touches folders this script names.
find "$backup_dir" -mindepth 1 -maxdepth 1 -type d -name 'flipside-????-??-??-??????' \
  -mtime "+$retention" -exec rm -rf {} +

echo "backup: wrote $final"
