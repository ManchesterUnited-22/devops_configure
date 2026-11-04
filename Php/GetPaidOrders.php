<?php
session_start();
header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

$sql = "SELECT date, product_name, total_quantity, total_price, employee_name 
        FROM paid_summary 
        ORDER BY date ASC, id ASC";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode(["status" => "error", "message" => $conn->error]);
    exit;
}

$data = [];

while ($row = $result->fetch_assoc()) {
    $data[] = [
        "date" => $row['date'],
        "product_name" => $row['product_name'],
        "total_quantity" => (int)$row['total_quantity'],
        "total_price" => (int)$row['total_price'],
        "employee_name" => $row['employee_name']
    ];
}

echo json_encode($data, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
