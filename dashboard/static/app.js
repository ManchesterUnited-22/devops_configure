const $ = id => document.getElementById(id);

async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Request failed"
        );
    }

    return data;
}

function setStatus(id, online) {
    const element = $(id);

    element.textContent =
        online ? "ONLINE" : "OFFLINE";

    element.className =
        online ? "online" : "offline";
}

async function refreshStatus() {
    try {
        const data = await api("/api/status");

        setStatus("jenkinsStatus", data.jenkins);
        setStatus("dockerStatus", data.docker);
        setStatus("websiteStatus", data.website);
        setStatus("aiStatus", data.ai.online);

    } catch (error) {
        console.error(error);

        ["jenkinsStatus", "dockerStatus",
         "websiteStatus", "aiStatus"].forEach(id => {
            $(id).textContent = "Unavailable";
            $(id).className = "offline";
         });
    }
}

async function loadContainers() {
    await showResult(
        "/api/containers",
        "containerResult"
    );
}

async function loadKubernetes() {
    await showResult(
        "/api/kubernetes",
        "kubernetesResult"
    );
}

async function showResult(url, target) {
    $(target).textContent = "Loading...";

    try {
        const data = await api(url);

        $(target).textContent =
            data.output || "No data";

    } catch (error) {
        $(target).textContent = error.message;
    }
}

async function loadLogs() {
    try {
        const data = await api("/api/logs");
        $("logInput").value = data.output;

    } catch (error) {
        $("logResult").textContent = error.message;
    }
}

async function aiRequest(url, body, target) {
    $(target).textContent =
        "AI đang phân tích, vui lòng chờ...";

    try {
        const data = await api(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        $(target).textContent = data.result;

    } catch (error) {
        $(target).textContent =
            "Error: " + error.message;
    }
}

async function analyzeLogs() {
    await aiRequest(
        "/api/analyze",
        {log: $("logInput").value},
        "logResult"
    );
}

async function reviewCode() {
    await aiRequest(
        "/api/review",
        {},
        "reviewResult"
    );
}

async function sendMessage() {
    await aiRequest(
        "/api/chat",
        {message: $("chatInput").value},
        "chatResult"
    );
}

refreshStatus();

setInterval(refreshStatus, 30000);