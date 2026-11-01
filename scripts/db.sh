#!/usr/bin/env bash
# Start or stop the local Postgres 17 container with Podman (no compose tool).
set -euo pipefail

NAME=flipside-postgres
VOLUME=flipside-pgdata
IMAGE=docker.io/library/postgres:17
USER_NAME=flipside
DB_NAME=flipside
PASSWORD="${POSTGRES_PASSWORD:-flipside}"

up() {
  podman volume exists "$VOLUME" || podman volume create "$VOLUME" >/dev/null
  if podman container exists "$NAME"; then
    if [ "$(podman inspect -f '{{.State.Running}}' "$NAME")" != "true" ]; then
      podman start "$NAME" >/dev/null
    fi
  else
    podman run -d --name "$NAME" \
      -p 127.0.0.1:5432:5432 \
      -v "$VOLUME":/var/lib/postgresql/data \
      -e POSTGRES_USER="$USER_NAME" \
      -e POSTGRES_PASSWORD="$PASSWORD" \
      -e POSTGRES_DB="$DB_NAME" \
      --health-cmd "pg_isready -U $USER_NAME -d $DB_NAME" \
      --health-interval 2s --health-retries 30 \
      "$IMAGE" >/dev/null
  fi
  for _ in $(seq 1 60); do
    if podman exec "$NAME" pg_isready -U "$USER_NAME" -d "$DB_NAME" -h 127.0.0.1 >/dev/null 2>&1; then
      echo "Postgres ready on 127.0.0.1:5432"
      return 0
    fi
    sleep 1
  done
  echo "Postgres did not become ready" >&2
  exit 1
}

down() {
  if podman container exists "$NAME"; then
    podman stop "$NAME" >/dev/null
    podman rm "$NAME" >/dev/null
  fi
  echo "Postgres stopped; volume $VOLUME kept"
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  *) echo "usage: db.sh up|down" >&2; exit 2 ;;
esac
