#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$PROJECT_ROOT/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
LOCK_FILE="$PROJECT_ROOT/uv.lock"
MARKER_FILE="$VENV_DIR/.deps-installed"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    echo "Interpreter '$PYTHON_BIN' not found" >&2
    exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

if [ ! -f "$MARKER_FILE" ] || { [ -f "$LOCK_FILE" ] && [ "$LOCK_FILE" -nt "$MARKER_FILE" ]; }; then
    python -m pip install --upgrade pip
    python -m pip install -e "$PROJECT_ROOT"
    touch "$MARKER_FILE"
fi

cd "$PROJECT_ROOT"
python manage.py "$@"
