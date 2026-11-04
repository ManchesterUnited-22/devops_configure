<?php
session_start();
header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

if (!$conn) {
    echo json_encode(["status"=>"error","message"=>"DB connection failed"]);
    exit;
}

$session_id = session_id();

// increase/decrease
$id = intval($_GET['id'] ?? 0);
$action = $_GET['action'] ?? '';

if ($id && $action) {
    $res = $conn->query("SELECT quantity FROM cart WHERE id=$id AND session_id='$session_id'");
    if ($res->num_rows === 0) {
        echo json_encode(["status"=>"error","message"=>"Món này không tìm thấy"]);
        exit;
    }
    $row = $res->fetch_assoc();
    $qty = intval($row['quantity']);

    if ($action === 'increase') {
        $qty++;
        $conn->query("UPDATE cart SET quantity=$qty WHERE id=$id AND session_id='$session_id'");
    } elseif ($action === 'decrease') {
        if ($qty > 1) { // tối thiểu = 1
            $qty--;
            $conn->query("UPDATE cart SET quantity=$qty WHERE id=$id AND session_id='$session_id'");
        }
    }

    echo json_encode(["status"=>"success","quantity"=>$qty]);
    exit;
}

// Thêm món mới 
$data = json_decode(file_get_contents("php://input"), true);

$name = $conn->real_escape_string($data['name'] ?? '');
$img = $conn->real_escape_string($data['img'] ?? '');
$price = intval($data['price'] ?? 0);
$quantity = intval($data['quantity'] ?? 1);
$table_number = intval($data['table_number'] ?? 0);

if (!$name || !$table_number) {
    echo json_encode(["status"=>"error","message"=>"quên tên or table_number"]);
    exit;
}

// Kiểm tra món đã tồn tại
$check = $conn->query("SELECT id, quantity FROM cart WHERE session_id='$session_id' AND table_number=$table_number AND product_name='$name'");
if ($check->num_rows > 0) {
    $row = $check->fetch_assoc();
    $newQty = $row['quantity'] + $quantity;
    $conn->query("UPDATE cart SET quantity=$newQty WHERE id=" . $row['id']);
} else {
    $conn->query("INSERT INTO cart (session_id, table_number, product_name, product_image, price, quantity)
                  VALUES ('$session_id', $table_number, '$name', '$img', $price, $quantity)");
}

echo json_encode([
    "status"=>"success",
    "data"=>[
        "name"=>$name,
        "price"=>$price,
        "quantity"=>$quantity,
        "table"=>$table_number
    ]
]);
