<?php
session_start();

header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

$sql = "SELECT date, total_income, total_expense FROM daily_revenue ORDER BY date DESC";
$res = $conn->query($sql);
$data = [];
while($row = $res->fetch_assoc()){
    $data[] = $row;
}
echo json_encode($data);
?>
