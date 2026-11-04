<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "Managing_Restaurant";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die(json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]));
}
$conn->set_charset("utf8");
?>
