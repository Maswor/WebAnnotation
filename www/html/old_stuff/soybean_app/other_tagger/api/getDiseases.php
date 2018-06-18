<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getDiseases()
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT * FROM Diseases");
  $stmt->execute();

  $res = $stmt->get_result();
  $diseases = array();
  while ($row = $res->fetch_assoc()) {
    array_push($diseases, array("id" => $row['disease_id'], "name" => $row['name']));
  }

  $stmt->close();

  return $diseases;
}

try {
  echo json_encode(getDiseases());
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
