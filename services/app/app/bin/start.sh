#!/bin/sh
set -eu

# Auto-run npm start if the project defines one (React dev server, backend, etc.)
if command -v npm >/dev/null 2>&1 && [ -f /app/package.json ]; then
    start_script="$(npm pkg get scripts.start 2>/dev/null || echo null)"
    if [ "$start_script" != "null" ]; then
        echo "[app-skeleton] Detected npm start script -> running 'npm run start'."
        exec npm run start "$@"
    fi
fi

echo "[app-skeleton] No npm start script found yet. Container is idle."
exec sleep infinity
