<?php
session_start();

include "Connect.php";

$table = intval($_GET['table'] ?? 0);

$res = $conn->query("SELECT id, total_price FROM orders 
                     WHERE table_number=$table 
                     AND status IN (
                        'Chờ thanh toán',
                        'Chờ xác nhận thanh toán'
                     )
                     ORDER BY id DESC LIMIT 1");

$row = $res->fetch_assoc();

echo json_encode([
    "order_id" => $row["id"],
    "amount"   => intval($row["total_price"])
]);
