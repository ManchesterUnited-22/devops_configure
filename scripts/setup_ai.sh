#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

echo "===== DEVOPS AI SETUP ====="

sudo apt-get update

sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl

echo "===== PYTHON ENVIRONMENT ====="

python3 -m venv .venv

.venv/bin/pip install --upgrade pip

.venv/bin/pip install -r requirements.txt

if [ ! -f .env ]; then
    cp .env.example .env
fi

echo "===== CHECK OLLAMA ====="

if ! command -v ollama >/dev/null 2>&1; then
    echo "Please install Ollama from:"
    echo "https://ollama.com/download/linux"
else
    echo "Ollama installed."
fi

echo "===== CHECK TRIVY ====="

if ! command -v trivy >/dev/null 2>&1; then
    echo "Please install Trivy from:"
    echo "https://trivy.dev/latest/getting-started/installation/"
else
    echo "Trivy installed."
fi

mkdir -p reports

echo "===== SETUP COMPLETE ====="