#!/usr/bin/env bash
# Đổi tham số cấu hình dự án FOOD&OUR (có backup, kiểm tra đầu vào, test nginx)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JENKINSFILE="$ROOT/Jenkinsfile"
NGINX_CONF="$ROOT/nginx/default.conf"
K8S_DEPLOY="$ROOT/k8s/deployment.yaml"
BACKUP_DIR="$ROOT/.config-backup"

usage() {
  cat <<EOF
Cách dùng: $0 <lệnh> [giá trị]
  port <1024-65535>     Đổi cổng host (HOST_PORT trong Jenkinsfile)
  container <tên>       Đổi tên container (CONTAINER_NAME)
  image <tên>           Đổi tên image (IMAGE_NAME)
  server-name <tên>     Đổi server_name trong nginx/default.conf
  max-body <vd: 10m>    Đổi client_max_body_size trong nginx/default.conf
  replicas <1-10>       Đổi số replicas trong k8s/deployment.yaml
  show                  Hiển thị giá trị hiện tại
  restore               Khôi phục các file từ bản backup gần nhất
EOF
}

die() { echo "Lỗi: $*" >&2; exit 1; }

backup() {
  mkdir -p "$BACKUP_DIR"
  cp "$1" "$BACKUP_DIR/$(basename "$1").$(date +%Y%m%d-%H%M%S).bak"
}

latest_backup() { ls -1t "$BACKUP_DIR/$(basename "$1")".*.bak 2>/dev/null | head -n1 || true; }

restore_one() {
  local b; b=$(latest_backup "$1")
  [[ -n "$b" ]] || return 0
  cp "$b" "$1" && echo "Đã khôi phục $1 từ $b"
}

valid_port()  { [[ $1 =~ ^[0-9]+$ ]] && (( $1 >= 1024 && $1 <= 65535 )); }
port_in_use() { ss -ltn "sport = :$1" | grep -q LISTEN; }

set_jenkins_env() {   # KEY value
  local key=$1 val=$2
  grep -qE "^ *$key = '" "$JENKINSFILE" || die "Không thấy $key trong Jenkinsfile"
  backup "$JENKINSFILE"
  sed -i -E "s|^( *$key = ').*(')|\1$val\2|" "$JENKINSFILE"
}

test_nginx() {
  command -v docker >/dev/null || { echo "Bỏ qua nginx -t (không có docker)"; return 0; }
  if docker run --rm -v "$NGINX_CONF:/etc/nginx/conf.d/default.conf:ro" \
       nginx:alpine nginx -t >/dev/null 2>&1; then
    echo "nginx -t: OK"
  else
    echo "nginx -t LỖI, khôi phục bản backup" >&2
    restore_one "$NGINX_CONF"
    exit 1
  fi
}

set_nginx() {         # directive value
  local d=$1 v=$2
  backup "$NGINX_CONF"
  if grep -qE "^\s*$d\s" "$NGINX_CONF"; then
    sed -i -E "s|^(\s*$d\s+).*;|\1$v;|" "$NGINX_CONF"
  else
    sed -i -E "/^\s*server_name/a\    $d $v;" "$NGINX_CONF"
  fi
  test_nginx
}

cmd=${1:-}; val=${2:-}

case "$cmd" in
  port)
    valid_port "$val" || die "Cổng phải là số từ 1024 đến 65535"
    cur=$(grep -oE "HOST_PORT = '[0-9]+'" "$JENKINSFILE" | grep -oE '[0-9]+' || true)
    if [[ "$val" != "$cur" ]] && port_in_use "$val"; then die "Cổng $val đang được sử dụng"; fi
    set_jenkins_env HOST_PORT "$val" ;;
  container)
    [[ $val =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || die "Tên container không hợp lệ"
    set_jenkins_env CONTAINER_NAME "$val" ;;
  image)
    [[ $val =~ ^[a-z0-9][a-z0-9_.-]*$ ]] || die "Tên image chỉ gồm chữ thường, số, _ . -"
    set_jenkins_env IMAGE_NAME "$val" ;;
  server-name)
    [[ $val =~ ^[a-zA-Z0-9._-]+$ ]] || die "server_name không hợp lệ"
    set_nginx server_name "$val" ;;
  max-body)
    [[ $val =~ ^[0-9]+[kKmM]$ ]] || die "Ví dụ hợp lệ: 512k, 10m"
    set_nginx client_max_body_size "$val" ;;
  replicas)
    [[ $val =~ ^([1-9]|10)$ ]] || die "replicas phải từ 1 đến 10"
    [[ -f "$K8S_DEPLOY" ]] || die "Chưa có $K8S_DEPLOY"
    backup "$K8S_DEPLOY"
    sed -i -E "s|^(\s*replicas:\s*).*|\1$val|" "$K8S_DEPLOY" ;;
  show)
    grep -E "HOST_PORT|CONTAINER_NAME|IMAGE_NAME" "$JENKINSFILE" || true
    grep -E "server_name|client_max_body_size" "$NGINX_CONF" || true
    [[ -f "$K8S_DEPLOY" ]] && grep -E "replicas" "$K8S_DEPLOY" || true
    exit 0 ;;
  restore)
    restore_one "$JENKINSFILE"; restore_one "$NGINX_CONF"
    [[ -f "$K8S_DEPLOY" ]] && restore_one "$K8S_DEPLOY" || true
    exit 0 ;;
  *) usage; exit 1 ;;
esac

echo "Đã cập nhật. Xem lại: git diff"
echo "Sau đó commit + push để Jenkins tự deploy."