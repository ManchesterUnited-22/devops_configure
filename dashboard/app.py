from pathlib import Path
import subprocess

import requests
from flask import Flask, render_template, jsonify, request

from ai.engine import ask_ai, check_ai_status
from ai.log_analyzer import analyze_log
from ai.code_review import review_code

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 128 * 1024

ROOT = Path(__file__).resolve().parent.parent


def run_command(args):
    try:
        result = subprocess.run(
            args,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=15
        )

        return {
            "success": result.returncode == 0,
            "output": (
                result.stdout or result.stderr
            ).strip()
        }

    except Exception as error:
        return {
            "success": False,
            "output": str(error)
        }


def check_http(url):
    try:
        response = requests.get(url, timeout=3)
        return response.status_code < 400
    except requests.RequestException:
        return False


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/status")
def status():
    return jsonify({
        "jenkins": check_http(
            "http://localhost:8080/login"
        ),
        "website": check_http(
            "http://localhost:8081"
        ),
        "docker": run_command(
            ["docker", "info", "--format", "{{.ServerVersion}}"]
        )["success"],
        "ai": check_ai_status()
    })


@app.get("/api/containers")
def containers():
    return jsonify(run_command([
        "docker", "ps", "-a",
        "--format",
        "{{.Names}}\t{{.Status}}\t{{.Ports}}"
    ]))


@app.get("/api/kubernetes")
def kubernetes():
    return jsonify(run_command([
        "kubectl", "get", "pods", "-A"
    ]))


@app.get("/api/logs")
def logs():
    return jsonify(run_command([
        "docker", "logs",
        "--tail", "100",
        "food-our-container"
    ]))


@app.post("/api/analyze")
def analyze():
    data = request.get_json(silent=True) or {}
    log = data.get("log", "")

    try:
        return jsonify({
            "result": analyze_log(log)
        })
    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 503


@app.post("/api/review")
def review():
    result = run_command([
        "git", "show", "--format=", "HEAD",
        "--", "Dockerfile", "Jenkinsfile",
        "nginx/", "k8s/", "scripts/"
    ])

    if not result["success"]:
        return jsonify({
            "error": result["output"]
        }), 500

    try:
        return jsonify({
            "result": review_code(result["output"])
        })
    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 503


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}

    message = str(data.get("message", "")).strip()

    if not message:
        return jsonify({
            "error": "Vui lòng nhập câu hỏi."
        }), 400

    try:
        return jsonify({
            "result": ask_ai(message[:4000])
        })
    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 503


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8090,
        debug=False
    )