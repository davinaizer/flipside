#!/usr/bin/env bash
# Stop hook: block ending a turn only if code changed and the checks are red.
cd "$(dirname "$0")/.."
if [ -z "$(git status --porcelain -- src tests e2e package.json 2>/dev/null)" ]; then
  exit 0
fi
bash scripts/verify.sh
