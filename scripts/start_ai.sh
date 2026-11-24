#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

if [ ! -f .venv/bin/python ]; then
    echo "Please run scripts/setup_ai.sh first."
    exit 1
fi

echo "======================================"
echo "         DEVOPS AI CENTER"
echo "======================================"
echo "Dashboard: http://localhost:8090"
echo "Ollama:    http://localhost:11434"
echo "======================================"

exec .venv/bin/python -m dashboard.app