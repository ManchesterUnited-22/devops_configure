<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
include("Connect.php"); 

$date = $_POST['date'] ?? '';
$expense = intval($_POST['expense'] ?? 0);

if(!$date || $expense <= 0){
    echo json_encode(["success"=>false, "message"=>"Dữ liệu không hợp lệ"]);
    exit;
}

// Kiểm tra ngày đã có trong bảng chưa
$sql_check = "SELECT id, total_expense FROM daily_revenue WHERE date = '$date'";
$result = $conn->query($sql_check);

if($result && $result->num_rows > 0){
    $row = $result->fetch_assoc();
    $new_expense = $row['total_expense'] + $expense;
    $conn->query("UPDATE daily_revenue SET total_expense = $new_expense WHERE id = ".$row['id']);
} else {
    $conn->query("INSERT INTO daily_revenue (date, total_expense) VALUES ('$date', $expense)");
}

echo json_encode(["success"=>true]);
?>
