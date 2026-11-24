#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "======================================"
echo "        DEVOPS AI BENCHMARK"
echo "======================================"

.venv/bin/python - <<'PY'
import os
import time
import statistics
import requests

from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

url = os.getenv(
    "OLLAMA_URL",
    "http://127.0.0.1:11434"
).rstrip("/")

model = os.getenv(
    "AI_MODEL",
    "qwen2.5-coder:3b"
)

samples = []

for i in range(3):

    print(f"\n[TEST {i + 1}/3]", flush=True)
    start = time.perf_counter()

    response = requests.post(
        f"{url}/api/generate",
        json={
            "model": model,
            "prompt": (
                "Explain Docker error: "
                "port is already allocated. "
                "Suggest one diagnostic command."
            ),
            "stream": False,
            "keep_alive": "10m",
            "options": {
                "num_predict": 100,
                "num_ctx": 4096,
                "temperature": 0.1
            }
        },
        timeout=(5, 120)
    )

    response.raise_for_status()

    elapsed = time.perf_counter() - start
    data = response.json()

    tokens = data.get("eval_count", 0)
    duration = data.get("eval_duration", 0) / 1e9
    speed = tokens / duration if duration else 0

    print(f"Model: {model}")
    print(f"Response time: {elapsed:.2f}s")
    print(f"Generated tokens: {tokens}")
    print(f"Speed: {speed:.2f} tokens/s")
    print(
        f"Load time: "
        f"{data.get('load_duration', 0) / 1e9:.2f}s"
    )

    samples.append(elapsed)

print("\n===== BENCHMARK SUMMARY =====")
print(f"Average: {statistics.mean(samples):.2f}s")
print(f"Minimum: {min(samples):.2f}s")
print(f"Maximum: {max(samples):.2f}s")
PY