#!/usr/bin/env bash
# Project check: typecheck, lint, format, tests. Task gate for agents and base of the Stop hook.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f package.json ]; then
  echo "verify: no package.json yet (F0 not started), skipping"
  exit 0
fi
pnpm -s typecheck
pnpm -s lint
pnpm -s format:check
pnpm -s test
