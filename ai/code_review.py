import subprocess
from ai.engine import ask_ai


def review_code(code):
    if not code.strip():
        return "Không có thay đổi cần kiểm tra."

    prompt = f"""
Phân tích thay đổi mã nguồn DevOps bên dưới.

Yêu cầu:
1. Phát hiện lỗi tiềm ẩn.
2. Kiểm tra Dockerfile và Jenkinsfile.
3. Kiểm tra cấu hình Nginx và Kubernetes.
4. Phân tích nguy cơ bảo mật.
5. Đề xuất cách tối ưu.
6. Kết luận mức độ rủi ro.

Chỉ đưa ra nhận xét dựa trên dữ liệu thực tế.

<CODE_DIFF>
{code[:12000]}
</CODE_DIFF>
"""

    return ask_ai(prompt)


if __name__ == "__main__":
    result = subprocess.run(
        [
            "git", "show",
            "--format=", "HEAD", "--",
            "Dockerfile", "Jenkinsfile",
            "nginx/", "k8s/", "scripts/"
        ],
        capture_output=True,
        text=True,
        check=True
    )

    print(review_code(result.stdout))