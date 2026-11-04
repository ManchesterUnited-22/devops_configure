<?php
session_start();
header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "error", "message" => "Phương thức không hợp lệ"]);
    exit;
}

$table_number = intval($_POST['table_number'] ?? 0);
$action = $_POST['action'] ?? '';

if (!$table_number) {
    echo json_encode(["status" => "error", "message" => "Thiếu số bàn"]);
    exit;
}

// Nếu action = pay
if ($action === 'pay') {

    // method = cash hoặc bank
    $method = $_POST['method'] ?? '';

    // Xác định giá trị iscash
    $iscash = ($method === 'cash') ? 1 : 0;

    // Lấy đơn hàng hiện tại
    $order_query = $conn->query("
        SELECT * FROM orders
        WHERE table_number=$table_number
          AND status IN (
              'Chờ xác nhận đơn hàng',
              'Chờ thanh toán',
              'Chờ xác nhận thanh toán'
          )
        LIMIT 1
    ");

    if (!$order_query || $order_query->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "Không tìm thấy đơn hàng"]);
        exit;
    }

    $order = $order_query->fetch_assoc();
    $order_id = $order['id'];

    // Update iscash
    $status_update = "Chờ xác nhận thanh toán";

    $conn->query("
        UPDATE orders
        SET iscash = $iscash,
            status = '$status_update'
        WHERE id = $order_id
    ");

    echo json_encode(["status" => "success", "message" => "Đã lưu phương thức thanh toán"]);
    exit;
}
 else {
    // Đặt món mới hoặc đặt thêm
    $cart_result = $conn->query("SELECT * FROM cart WHERE table_number=$table_number");
    if (!$cart_result || $cart_result->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "Giỏ hàng trống"]);
        exit;
    }

    $total_price = 0;
    $total_quantity = 0;
    $items = [];
    while ($row = $cart_result->fetch_assoc()) {
        $total_price += $row['price'] * $row['quantity'];
        $total_quantity += $row['quantity'];
        $items[] = $row;
    }

    $new_status = 'Chờ xác nhận đơn hàng';
    $order_query = $conn->query("SELECT * FROM orders WHERE table_number=$table_number AND status IN ('Chờ xác nhận đơn hàng','Chờ thanh toán','Chờ xác nhận thanh toán') LIMIT 1");

    if ($order_query && $order_query->num_rows > 0) {
        $order = $order_query->fetch_assoc();
        $order_id = $order['id'];

        $conn->query("UPDATE orders SET status='Chờ xác nhận đơn hàng' WHERE id=$order_id");

        foreach ($items as $item) {
            $product_name = $conn->real_escape_string($item['product_name']);
            $product_image = $conn->real_escape_string($item['product_image']);
            $price = intval($item['price']);
            $quantity = intval($item['quantity']);

            $check_detail = $conn->query("SELECT * FROM order_details WHERE order_id=$order_id AND product_name='$product_name'");
            if ($check_detail && $check_detail->num_rows > 0) {
                $conn->query("UPDATE order_details SET quantity = quantity + $quantity WHERE order_id=$order_id AND product_name='$product_name'");
            } else {
                $conn->query("INSERT INTO order_details (order_id, product_name, product_image, price, quantity)
                VALUES ($order_id, '$product_name', '$product_image', $price, $quantity)");
              }
        }

        $conn->query("UPDATE orders 
                      SET total_price = total_price + $total_price,
                          total_quantity = total_quantity + $total_quantity
                      WHERE id=$order_id");
    } else {
        $conn->query("INSERT INTO orders (table_number, total_price, total_quantity, status)
                      VALUES ($table_number, $total_price, $total_quantity, '$new_status')");
        $order_id = $conn->insert_id;

        foreach ($items as $item) {
            $product_name = $conn->real_escape_string($item['product_name']);
            $product_image = $conn->real_escape_string($item['product_image']);
            $price = intval($item['price']);
            $quantity = intval($item['quantity']);
            
            $conn->query("INSERT INTO order_details (order_id, product_name, product_image, price, quantity)
            VALUES ($order_id, '$product_name', '$product_image', $price, $quantity)");

        }
    }

    $conn->query("DELETE FROM cart WHERE table_number=$table_number");
}

echo json_encode([
    "status" => "success",
]);

$conn->close();
?>
