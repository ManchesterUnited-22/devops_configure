<?php
session_start();

header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

$order_id = $_POST["order_id"];
$status = $_POST["status"];

// Lấy nhân viên đang đăng nhập 
$sql_emp = "SELECT e.full_name, ws.id AS shift_id
            FROM employees e
            JOIN work_shift ws ON e.id = ws.employee_id
            WHERE ws.check_out IS NULL
            LIMIT 1";
$result_emp = $conn->query($sql_emp);
if ($result_emp->num_rows === 0) {
    echo json_encode(['success'=>false,'message'=>'Không có nhân viên đăng nhập']);
    exit;
}
$employee = $result_emp->fetch_assoc();
$employee_name = $employee['full_name'];

// Lấy chi tiết đơn
$sql_details = "SELECT product_name, price, quantity FROM order_details WHERE order_id = $order_id";
$res_details = $conn->query($sql_details);

// Nếu status là Đã thanh toán
if ($status === "Đã thanh toán") {
    //  Cập nhật trạng thái đơn
    $sql = "UPDATE orders SET status = '$status', payment_time = NOW() WHERE id = $order_id";
    $conn->query($sql);

    //  Lưu chi tiết 
    while($row = $res_details->fetch_assoc()) {
        $product_name = $row['product_name'];
        $quantity = $row['quantity'];
        $total_price = $row['price'] * $quantity;

        // Kiểm tra xem  ngày,  sản phẩm,  nhân viên 
        $today = date('Y-m-d');
        $sql_check = "SELECT id, total_quantity, total_price 
                      FROM paid_summary 
                      WHERE date = '$today' 
                      AND product_name = '$product_name' 
                      AND employee_name = '$employee_name'";
        $res_check = $conn->query($sql_check);

        if($res_check->num_rows > 0){
            $existing = $res_check->fetch_assoc();
            $new_qty = $existing['total_quantity'] + $quantity;
            $new_price = $existing['total_price'] + $total_price;
            $sql_update = "UPDATE paid_summary SET total_quantity=$new_qty, total_price=$new_price 
                           WHERE id=".$existing['id'];
            $conn->query($sql_update);
        } else {
            $sql_insert = "INSERT INTO paid_summary (date, product_name, total_quantity, total_price, employee_name)
                           VALUES ('$today', '$product_name', $quantity, $total_price, '$employee_name')";
            $conn->query($sql_insert);
        }
    }

    //  Cập nhật tổng thu 
    $sql_revenue = "SELECT id, total_income FROM daily_revenue WHERE date='$today'";
    $res_rev = $conn->query($sql_revenue);
    $order_total = 0;
    $res_details->data_seek(0);  
    while($row = $res_details->fetch_assoc()) $order_total += $row['price'] * $row['quantity'];

    if($res_rev->num_rows > 0){
        $rev = $res_rev->fetch_assoc();
        $new_total = $rev['total_income'] + $order_total;
        $conn->query("UPDATE daily_revenue SET total_income=$new_total WHERE id=".$rev['id']);
    } else {
        $conn->query("INSERT INTO daily_revenue (date, total_income) VALUES ('$today', $order_total)");
    }

    echo json_encode(["success" => true]);
} else {
    // Chỉ cập nhật trạng thái
    $sql = "UPDATE orders SET status = '$status' WHERE id = $order_id";
    $conn->query($sql);
    echo json_encode(["success" => true]);
}
?>
