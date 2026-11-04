<?php
session_start();
header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

if (!$conn) {
    echo json_encode(["status"=>"error","message"=>"DB connection failed"]);
    exit;
}

$session_id = session_id();
$id = intval($_GET['id'] ?? 0);

if (!$id) {
    echo json_encode(["status"=>"error","message"=>"Missing item id"]);
    exit;
}

$conn->query("DELETE FROM cart WHERE id=$id AND session_id='$session_id'");
echo json_encode(["status"=>"success","message"=>"Đã xóa món khỏi giỏ hàng"]);
