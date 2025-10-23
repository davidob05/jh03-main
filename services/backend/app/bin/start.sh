#!/bin/sh
set -eu

cd /app

if [ ! -f package.json ]; then
    echo "[backend] No package.json found. Container is idle."
    exec sleep infinity
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[backend] npm is not available in the container."
    exec sleep infinity
fi

# Install dependencies if missing.
if [ ! -d node_modules ]; then
    echo "[backend] Installing dependencies..."
    npm install
fi

echo "[backend] Starting API server..."
exec npm run dev "$@"
