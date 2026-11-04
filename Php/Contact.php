<?php
session_start();
header("Content-Type: application/json");
include(__DIR__ . "/Connect.php"); 

$email = $_POST['email'] ?? null;
$phone = $_POST['phone'] ?? null;
$name = $_POST['name'] ?? null;
$message = $_POST['message'] ?? null;
$rating = isset($_POST['rating']) ? intval($_POST['rating']) : 0;
$datetime = $_POST['datetime'] ?? date('Y-m-d H:i:s');

$stmt = $conn->prepare("INSERT INTO contact (email, phone, name, message, rating, datetime) VALUES (?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    echo json_encode(["status" => "error", "message" => $conn->error]);
    exit;
}
$stmt->bind_param("ssssis", $email, $phone, $name, $message, $rating, $datetime);

if($stmt->execute()){
    echo json_encode(["status" => "success", "message" => "Gửi thông tin thành công!"]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
