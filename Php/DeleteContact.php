<?php
header("Content-Type: application/json");
include("Connect.php"); 

$input = json_decode(file_get_contents("php://input"), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;

if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Thiếu ID hoặc ID không hợp lệ']);
    exit;
}

$stmt = $conn->prepare("DELETE FROM contact WHERE id = ?");
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Lỗi prepare: ' . $conn->error]);
    exit;
}

$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Đã xóa đánh giá!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy đánh giá']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Lỗi khi xóa: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
