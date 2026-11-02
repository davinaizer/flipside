#!/usr/bin/env bash
# Restore a backup made by scripts/backup.sh: the database (pg_restore through podman exec)
# and the images folder.
#
# Usage: restore.sh <backup-folder> [--yes]
# Without --yes the script refuses to overwrite a database that has rows or an images
# folder that has files. Env (all optional): IMAGE_STORE_PATH (./data/images),
# PG_CONTAINER (flipside-postgres), PG_USER (flipside), PG_DB (flipside).
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
images="${IMAGE_STORE_PATH:-$repo/data/images}"
container="${PG_CONTAINER:-flipside-postgres}"
pg_user="${PG_USER:-flipside}"
pg_db="${PG_DB:-flipside}"

src="${1:-}"
confirm="${2:-}"
[ -n "$src" ] || { echo "usage: restore.sh <backup-folder> [--yes]" >&2; exit 2; }
[ -z "$confirm" ] || [ "$confirm" = "--yes" ] || { echo "restore: unknown flag $confirm" >&2; exit 2; }
[ -s "$src/database.dump" ] && [ -f "$src/images.tar.gz" ] ||
  { echo "restore: $src has no database.dump and images.tar.gz" >&2; exit 2; }

psql_q() { podman exec "$container" psql -U "$pg_user" -d "$pg_db" -tA -c "$1"; }

# Total rows over every table in the public schema (0 when the schema is empty).
rows="$(psql_q "select coalesce(sum((xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', schemaname, tablename), false, true, '')))[1]::text::int), 0) from pg_tables where schemaname = 'public'")"
files=0
[ -d "$images" ] && files="$(find "$images" -type f | wc -l | tr -d ' ')"

if [ "$confirm" != "--yes" ] && { [ "$rows" -gt 0 ] || [ "$files" -gt 0 ]; }; then
  echo "restore: refusing to overwrite existing data ($rows database rows, $files image files)." >&2
  echo "restore: run again with --yes to replace it." >&2
  exit 3
fi

podman exec -i "$container" pg_restore -U "$pg_user" -d "$pg_db" \
  --clean --if-exists --no-owner --exit-on-error < "$src/database.dump"

mkdir -p "$images"
find "$images" -mindepth 1 -delete
tar -xzf "$src/images.tar.gz" -C "$images"

echo "restore: restored $src"
