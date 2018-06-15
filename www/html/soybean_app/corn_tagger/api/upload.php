<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function putData($image_id, $author, $paths)
{
  $conn = db_connect();
  
  $stmt = $conn->prepare("INSERT INTO MarkedData (image_id, author, path) VALUES (?, ?, ?)");
  $stmt->bind_param("iss", $image_id, $author, $paths);
  $stmt->execute();

  $mark_id = $stmt->insert_id;
  if ($mark_id <= 0)
    throw new Exception("error inserting into MarkedData");

  $stmt->close();

  return $mark_id;
}

$body = file_get_contents('php://input');
$body = json_decode($body, true);

try {
  $mark_id = putData($body['image_id'], $body['author'], $body['paths']);
  echo json_encode(array(
    "mark_id" => $mark_id
  ));
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array ("errorMessage" => $e->getMessage()));
}

?>
