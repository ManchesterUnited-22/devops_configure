<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

$mysqli = new mysqli("localhost", "root", "", "Managing_Restaurant");
if ($mysqli->connect_errno) {
    echo json_encode(['success' => false, 'message' => 'Lỗi kết nối DB']);
    exit;
}
$mysqli->set_charset("utf8");

$data = json_decode(file_get_contents("php://input"), true);
$username = $data['username'] ?? 'guest';
$password = $data['password'] ?? '123'; 

// KIỂM TRA USERNAME
$stmt = $mysqli->prepare("SELECT id, full_name, password, is_logged_in FROM employees WHERE username=?");
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode(['success'=>false, 'message'=>'Tên đăng nhập không tồn tại']);
    exit;
}

$user = $res->fetch_assoc();

// KIỂM TRA PASSWORD
if ($user['password'] !== $password) {
    echo json_encode(['success'=>false, 'message'=>'Sai mật khẩu']);
    exit;
}

// KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
if ($user['is_logged_in'] == 1) {
    echo json_encode(['success'=>false, 'message'=>'Tài khoản đang sử dụng! Vui lòng đăng xuất trước.']);
    exit;
}

// CẬP NHẬT TRẠNG THÁI ĐĂNG NHẬP
$update = $mysqli->prepare("UPDATE employees SET is_logged_in = 1 WHERE id=?");
$update->bind_param("i", $user['id']);
$update->execute();

// Tính ca làm
$hour = (int)date("H");
if ($hour >= 5 && $hour < 12) $shift_name = "Ca sáng";
elseif ($hour >= 12 && $hour < 18) $shift_name = "Ca chiều";
else $shift_name = "Ca tối";

/* LƯU CA LÀM */
$stmt2 = $mysqli->prepare("
    INSERT INTO work_shift (employee_id, shift_name, date_work, check_in)
    VALUES (?, ?, CURDATE(), NOW())
");
$stmt2->bind_param("is", $user['id'], $shift_name);
$stmt2->execute();

$_SESSION['employee_id'] = $user['id'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['shift'] = $shift_name; 

echo json_encode([
    "success" => true,
    "full_name" => $user["full_name"],
    "shift" => $shift_name
]);
exit;
?>
