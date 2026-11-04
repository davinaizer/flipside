#!/usr/bin/env bash
# Stop hook: block ending a turn only if code changed and the checks are red.
cd "$(dirname "$0")/.."
# Hooks run in a non-interactive shell that skips ~/.zshrc, so load nvm here for node.
if ! command -v node >/dev/null && [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
  nvm use --silent node >/dev/null # newest installed; the nvm default alias may point at an uninstalled release
fi
# pnpm's standalone install puts its bin under PNPM_HOME, also set only in ~/.zshrc.
command -v pnpm >/dev/null || export PATH="${PNPM_HOME:-$HOME/Library/pnpm}/bin:$PATH"
if [ -z "$(git status --porcelain -- src tests e2e package.json 2>/dev/null)" ]; then
  exit 0
fi
bash scripts/verify.sh
