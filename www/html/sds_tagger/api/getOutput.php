<?php

//Just for testing, viewing output

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getMarkData($author)
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT * FROM MarkedData WHERE author = ?");
  $stmt->bind_param("s", $author);
  $stmt->execute();
  $res = $stmt->get_result();
  if ($res === null)
    return null;

  $mark_data = array();
  
  
  while ($row = $res->fetch_assoc()) {
    array_push($mark_data, array("mark_id"=> $row['mark_id'], "image_id"=> $row['image_id'], "path"=> $row['path']) );
  }
  return $mark_data;
}

try {
  if (!isset($_GET['author']))
    throw new Exception("Missing author");

  echo json_encode(getMarkData($_GET['author']));
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
