<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
include(__DIR__ . "/Connect.php");

$table_number = intval($_GET['table'] ?? 0);
if (!$table_number) {
    echo json_encode(["status" => "error", "message" => "Thiếu số bàn"]);
    exit;
}

$order_items = [];

// Lấy order "Chờ thanh toán" của bàn
$order_query = $conn->query("
    SELECT id FROM orders 
    WHERE table_number=$table_number 
    AND status IN ('Chờ xác nhận đơn hàng','Chờ thanh toán','Chờ xác nhận thanh toán') 
    LIMIT 1
");

if ($order_query && $order_query->num_rows > 0) {
    $order_id = $order_query->fetch_assoc()['id'];

    // Lấy danh sách món 
    $result = $conn->query("SELECT * FROM order_details WHERE order_id=$order_id");

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $order_items[] = $row;
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Lỗi truy vấn order_details: " . $conn->error]);
        exit;
    }
}

echo json_encode($order_items);
$conn->close();
?>
