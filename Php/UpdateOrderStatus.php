<?php
session_start();

header("Content-Type: application/json; charset=UTF-8");
include(__DIR__ . "/Connect.php");

$order_id = intval($_POST['order_id'] ?? 0);
$next_status = $_POST['next_status'] ?? "";

if (!$order_id || !$next_status) {
    echo json_encode(["status" => "error", "message" => "Thiếu dữ liệu"]);
    exit;
}

$stmt = $conn->prepare("UPDATE orders SET status=? WHERE id=?");
$stmt->bind_param("si", $next_status, $order_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error"]);
}

$conn->close();
?>
