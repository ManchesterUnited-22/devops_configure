<?php
session_start();
header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

$session_id = session_id();
$table_number = intval($_GET['table'] ?? 0);
if (!$table_number) {
    echo json_encode(["status" => "error", "message" => "Missing table_number"]);
    exit;
}

$result = $conn->query("SELECT * FROM cart WHERE session_id='$session_id' AND table_number=$table_number");
$cart = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $cart[] = $row;
    }
}

echo json_encode($cart);
$conn->close();
?>
