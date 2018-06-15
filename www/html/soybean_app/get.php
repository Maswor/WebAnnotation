<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';
require_once 'images.php';

try {
  if (!isset($_GET['id']))
    throw new Exception("Invalid ID argument");

  $id = $_GET['id'];

  $conn = db_connect();

  $stmt = $conn->prepare("SELECT * FROM Uploads WHERE upload_id = ?");
  $stmt->bind_param("i", $id);
  $stmt->execute();

  $res = $stmt->get_result();

  $row = $res->fetch_assoc();
  if ($row === null)
    throw new Exception("No upload ID '" . $id . "'");

  $obj = array(
    "upload_id" => $row['upload_id'],
    "upload_date" => $row['upload_date'],
    "author" => $row['author'],
    "disease" => $row['disease'],

    "image_url" => get_image_url($id),
    "taken_date" => $row['taken_date'],
    "cropRect" => array(
      "x" => $row['cropRectX'],
      "y" => $row['cropRectY'],
      "w" => $row['cropRectW'],
      "h" => $row['cropRectH'],
    ),

    "latitude" => $row['latitude'],
    "longitude" => $row['longitude'],

    "severity" => $row['severity']
  );

  $stmt->close();

  echo json_encode($obj);
} catch (Exception $e) {
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
