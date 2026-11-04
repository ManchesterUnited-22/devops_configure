<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
include(__DIR__ . "/Connect.php");

$sql = "
    SELECT e.full_name, w.shift_name, w.date_work, w.check_in, w.check_out
    FROM work_shift w
    INNER JOIN employees e ON w.employee_id = e.id
    ORDER BY w.date_work DESC, e.full_name
";

$result = $conn->query($sql);

$data = [];
if($result){
    while($row = $result->fetch_assoc()){
        $data[] = $row;
    }
}

echo json_encode($data);
?>
