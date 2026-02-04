#!/usr/bin/env bash
set -euo pipefail

DOC_DIR="handover/developer_docs"
MAIN_TEX="${DOC_DIR}/main.tex"
OUTPUT_DIR="${DOC_DIR}/build"

if ! command -v pdflatex >/dev/null 2>&1; then
  echo "pdflatex not found. Install a LaTeX distribution (e.g., TeX Live or MacTeX)." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Run twice to resolve references and TOC.
pdflatex -interaction=nonstopmode -halt-on-error -output-directory "$OUTPUT_DIR" "$MAIN_TEX"
pdflatex -interaction=nonstopmode -halt-on-error -output-directory "$OUTPUT_DIR" "$MAIN_TEX"

cp "$OUTPUT_DIR/main.pdf" "./developer_docs.pdf"

printf "Generated %s\n" "$(pwd)/developer_docs.pdf"
