#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed. Install Node.js (which includes npm) first." >&2
  exit 1
fi

cd "$FRONTEND_DIR"
if [[ ! -d node_modules ]]; then
  echo "Installing frontend dependencies..."
  npm install
fi

exec npm run dev -- --port "${FRONTEND_PORT:-3000}"
