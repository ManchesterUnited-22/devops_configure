<?php
include "Connect.php";

$id = intval($_POST['id'] ?? 0);
$from = $_POST['from_date'] ?? '';
$to = $_POST['to_date'] ?? '';

// xoá theo ID
if($id > 0){
    $sql = "DELETE FROM contact WHERE id = $id";
    if($conn->query($sql)){
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => $conn->error]);
    }
    exit;
}

// xoá theo khoảng ngày
if($from && $to){
    $sql = "DELETE FROM contact WHERE DATE(datetime) BETWEEN '$from' AND '$to'";
    if($conn->query($sql)){
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => $conn->error]);
    }
    exit;
}

echo json_encode(["success" => false, "message" => "Dữ liệu không hợp lệ"]);
?>
