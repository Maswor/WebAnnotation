<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getProgress($user)
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM MarkedData WHERE author = ?");
  $stmt->bind_param("s", $user);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $n_marked = $row['cnt'];
  $stmt->close();

  $stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM Images");
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $n_total = $row['cnt'];
  $stmt->close();

  return array(
    "marked" => $n_marked,
    "total" => $n_total
  );
}

try {
  if (!isset($_GET['author']))
    throw new Exception("Missing author");

  echo json_encode(getProgress($_GET['author']));
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array ("errorMessage" => $e->getMessage()));
}

?>
