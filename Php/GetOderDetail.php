<?php
session_start();

header("Content-Type: application/json; charset=UTF-8");
include(__DIR__ . "/Connect.php");
$order_id = $_GET["order_id"];

$sql = "SELECT * FROM order_details WHERE order_id = $order_id";
$result = $conn->query($sql);

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);
?>

