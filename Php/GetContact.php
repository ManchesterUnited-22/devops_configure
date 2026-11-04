<?php
session_start();
header("Content-Type: application/json");
include(__DIR__ . "/Connect.php");

$sql = "SELECT * FROM contact ORDER BY datetime DESC";
$result = $conn->query($sql);

$data = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $feedbackTime = date("Y-m-d H:i:s", strtotime($row['datetime']));

        $emp_sql = "SELECT e.full_name, w.check_in, w.check_out
                    FROM employees e
                    JOIN work_shift w ON e.id = w.employee_id
                    WHERE w.check_in <= '$feedbackTime' 
                      AND w.check_out >= '$feedbackTime'";

        $emp_result = $conn->query($emp_sql);

        $employees = [];
        if($emp_result && $emp_result->num_rows > 0){
            while($emp_row = $emp_result->fetch_assoc()){
                $employees[] = $emp_row['full_name'] . " (" . $emp_row['check_in'] . " đến  " . $emp_row['check_out'] . ")";
            }
        } else {
            $employees[] = "Không có nhân viên trong ca";
        }

        $row['employee_list'] = $employees; 
        $data[] = $row;
    }
} else {
    die("Lỗi khi truy vấn feedback: " . $conn->error);
}

echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
