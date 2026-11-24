import sys
import re
from ai.engine import ask_ai


def sanitize_log(log):
    log = re.sub(
        r"(?i)((?:password|token|secret|api[_-]?key)"
        r"\s*[:=]\s*)[^\s,;]+",
        r"\1[REDACTED]",
        log
    )

    return log


def analyze_log(log):
    if not log.strip():
        return "Không có log để phân tích."

    log = sanitize_log(log)

    prompt = f"""
Bạn là chuyên gia DevOps.

Phân tích log hệ thống sau đây:

<LOG>
{log[-12000:]}
</LOG>

Trả lời bằng tiếng Việt:
1. Tình trạng hệ thống.
2. Các lỗi được phát hiện.
3. Nguyên nhân có khả năng xảy ra.
4. Mức độ nghiêm trọng.
5. Lệnh kiểm tra được đề xuất.
6. Hướng khắc phục an toàn.

Không tự thực hiện lệnh.
Không suy diễn những lỗi không có bằng chứng.
"""

    return ask_ai(prompt)


if __name__ == "__main__":
    print(analyze_log(sys.stdin.read()))