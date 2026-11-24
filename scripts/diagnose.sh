#!/usr/bin/env bash

set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="reports/diagnostic_${TIMESTAMP}_$$"

mkdir -p "$REPORT_DIR"

LOG_FILE="$REPORT_DIR/system.log"
AI_REPORT="$REPORT_DIR/ai-analysis.txt"

START=$SECONDS

echo "======================================"
echo "      LINUX SYSTEM DIAGNOSTICS"
echo "======================================"

collect() {
    echo
    echo "===== $1 ====="
    shift

    timeout 20 "$@" 2>&1 || {
        echo "[WARNING] Check failed or timed out."
    }
}

{
    collect "DATE" date
    collect "KERNEL" uname -a
    collect "UPTIME" uptime
    collect "CPU" lscpu
    collect "MEMORY" free -h
    collect "DISK" df -h /
    collect "JENKINS" systemctl is-active jenkins
    collect "DOCKER" docker ps -a
    collect "DOCKER RESOURCES" docker stats --no-stream

    collect "WEBSITE HEALTHCHECK" \
        curl -fsS \
        --max-time 5 \
        -o /dev/null \
        -w "HTTP Status: %{http_code}\n" \
        http://localhost:8081

    collect "KUBERNETES" \
        kubectl get pods -A --request-timeout=5s

    collect "OLLAMA" ollama ps

    collect "CONTAINER LOGS" \
        docker logs --tail 50 food-our-container

} | tee "$LOG_FILE"

echo "[INFO] Diagnostic collection complete."

if [[ "${1:-}" == "--ai" ]]; then

    echo "[AI] Starting incident analysis..."

    if timeout 150 .venv/bin/python \
        -m ai.log_analyzer \
        < "$LOG_FILE" | tee "$AI_REPORT"; then

        echo "[AI] Analysis completed."
    else
        echo "[WARNING] AI analysis failed or timed out."
        exit 1
    fi

fi

echo "[TIME] Total: $((SECONDS - START)) seconds"
echo "[REPORT] $REPORT_DIR"