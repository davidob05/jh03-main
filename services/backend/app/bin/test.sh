#!/bin/sh
set -eu

cd /app

if [ ! -d node_modules ]; then
    echo "[backend:test] Installing dependencies..."
    npm install
fi

exec npm test "$@"
