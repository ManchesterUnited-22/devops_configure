document.getElementById("login-form").onsubmit = function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    fetch("/Managing_Restaurant/PHP/Login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        return response.json().catch(() => {
            throw new Error("Không thể đọc JSON từ PHP");
        });
    })
    .then(data => {
        if (data.success) {
            localStorage.setItem("full_name", data.full_name);
            window.location.href = "/Managing_Restaurant/HTML/User/Managing.html";
        } else {
            document.getElementById("error-msg").innerText = data.message;
        }
    })
    .catch(err => {
        document.getElementById("error-msg").innerText = "Lỗi kết nối server!";
        console.log("Fetch error:", err);
    });
};
