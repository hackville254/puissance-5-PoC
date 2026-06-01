#!/usr/bin/env bash
set -euo pipefail

TARGET=""
if [[ -f ".nvmrc" ]]; then
  TARGET="$(cat .nvmrc | tr -d '[:space:]')"
elif [[ -f ".node-version" ]]; then
  TARGET="$(cat .node-version | tr -d '[:space:]')"
else
  TARGET="20.19.4"
fi

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env)"
  fnm install "${TARGET}" >/dev/null 2>&1 || true
  fnm use "${TARGET}" >/dev/null
fi

node scripts/check-node.js

exec "$@"
