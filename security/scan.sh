#!/usr/bin/env bash

set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="${1:-food-our-web:latest}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="reports/security_${TIMESTAMP}_$$"

START=$SECONDS

mkdir -p "$REPORT_DIR"

echo "======================================"
echo "       TRIVY SECURITY SCANNER"
echo "======================================"

if ! command -v trivy >/dev/null 2>&1; then
    echo "[ERROR] Trivy is not installed."
    exit 1
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "[ERROR] Image not found: $IMAGE"
    exit 1
fi

echo "[INFO] Image: $IMAGE"
echo "[INFO] Report: $REPORT_DIR"

echo "[SCAN] Checking source code..."

trivy fs \
    --scanners vuln,secret,misconfig \
    --skip-dirs .venv \
    --skip-dirs .git \
    --skip-dirs reports \
    --severity HIGH,CRITICAL \
    --format json \
    --output "$REPORT_DIR/source.json" \
    .

echo "[SCAN] Checking Docker image..."

trivy image \
    --scanners vuln \
    --severity HIGH,CRITICAL \
    --format json \
    --output "$REPORT_DIR/image.json" \
    "$IMAGE"

echo "[INFO] Generating summary..."

python3 - "$REPORT_DIR" <<'PY'
import json
import sys
from pathlib import Path

folder = Path(sys.argv[1])
critical = 0
high = 0

for filename in ("source.json", "image.json"):
    data = json.loads((folder / filename).read_text())
    counts = {"HIGH": 0, "CRITICAL": 0}

    for result in data.get("Results", []):
        for category in (
            "Vulnerabilities",
            "Misconfigurations",
            "Secrets"
        ):
            for item in result.get(category) or []:
                severity = item.get("Severity")
                if severity in counts:
                    counts[severity] += 1

    high += counts["HIGH"]
    critical += counts["CRITICAL"]

    print(
        f"[REPORT] {filename}: "
        f"HIGH={counts['HIGH']} "
        f"CRITICAL={counts['CRITICAL']}"
    )

summary = {
    "high": high,
    "critical": critical
}

(folder / "summary.json").write_text(
    json.dumps(summary, indent=2)
)

print(f"[TOTAL] HIGH: {high}")
print(f"[TOTAL] CRITICAL: {critical}")

if critical:
    print("[SECURITY] Deployment blocked.")
    sys.exit(2)

print("[SECURITY] Critical security gate passed.")
PY

echo "[TIME] Completed in $((SECONDS - START)) seconds."