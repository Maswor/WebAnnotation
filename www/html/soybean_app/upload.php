<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';
require_once 'images.php';

try {
  // read POST request body into $body
  $body = file_get_contents('php://input');
  $body = json_decode($body, true);

  if (!isset($body['image_base64']))
    throw new Exception("image_base64 field missing");

  $conn = db_connect();

  $stmt = $conn->prepare("INSERT INTO Uploads (upload_date, author, disease, taken_date, cropRectX, cropRectY, cropRectW, cropRectH, latitude, longitude, severity) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  $stmt->bind_param("sssiiiiddi", $body['author'], $body['disease'], $body['takenDate'], $body['cropRect']['x'], $body['cropRect']['y'], $body['cropRect']['w'], $body['cropRect']['h'], $body['latitude'], $body['longitude'], $body['severity']);
  $stmt->execute();

  $upload_id = $stmt->insert_id;
  assert($upload_id > 0);

  $stmt->close();

  save_image_base64($upload_id, $body['image_base64']);

  echo json_encode(array(
    "upload_id" => $upload_id
  ));
} catch (Exception $e) {
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
