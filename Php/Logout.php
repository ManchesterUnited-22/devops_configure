<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
include(__DIR__ . "/Connect.php");

if(!isset($_SESSION['employee_id'])){
    echo json_encode(['success'=>false, 'message'=>'Chưa đăng nhập']);
    exit;
}

$employee_id = $_SESSION['employee_id'];

// UPDATE check_out cho lần đăng nhập mới nhất
$stmt = $conn->prepare("
    UPDATE work_shift
    SET check_out = NOW()
    WHERE employee_id = ?
    ORDER BY id DESC LIMIT 1
");
$stmt->bind_param("i", $employee_id);
$stmt->execute();

// ĐÁNH DẤU LÀ ĐÃ ĐĂNG XUẤT
$stmt2 = $conn->prepare("UPDATE employees SET is_logged_in = 0 WHERE id=?");
$stmt2->bind_param("i", $employee_id);
$stmt2->execute();

session_unset();
session_destroy();

echo json_encode(['success'=>true]);
?>
