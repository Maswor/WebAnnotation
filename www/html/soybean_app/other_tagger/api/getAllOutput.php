<?php

//Just for testing, viewing output

ini_set('display_errors', 1);
ini_set('memory_limit', '1000M');
error_reporting(-1);

require_once 'db.php';

function getMarkData()
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT * FROM MarkedData WHERE author='Jae' AND mark_id > 2235");
  //$stmt->bind_param("s", $author);
  $stmt->execute();
  $res = $stmt->get_result();
  if ($res === null)
    return null;

  $mark_data = array();
  
  
  while ($row = $res->fetch_assoc()) {
	  
	  $mark_id = $row['mark_id'];

	  array_push($mark_data, array("mark_id"=> $mark_id, "image_id"=> $row['image_id'], "path"=> $row['path'], "author" => $row['author']) );
  }
  $stmt->close();

  return $mark_data;
}

try {


  echo json_encode(getMarkData());
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
