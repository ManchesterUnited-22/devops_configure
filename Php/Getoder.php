<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
include(__DIR__ . "/Connect.php");

$status = $_GET["status"] ?? "";

if ($status === "pending") {
    $sql = "SELECT id, table_number, total_price, total_quantity, status, iscash, order_time
            FROM orders 
            WHERE status != 'Đã thanh toán'
            ORDER BY order_time DESC";
} 
else if ($status === "paid") {
    $sql = "SELECT id, table_number, total_price, total_quantity, status, iscash, order_time
            FROM orders 
            WHERE status = 'Đã thanh toán'
            ORDER BY order_time DESC";
} 
else {
    echo json_encode([]);
    exit;
}

$result = $conn->query($sql);

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);
?>
