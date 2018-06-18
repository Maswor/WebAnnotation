<?php

//Gets all marking data for a specified user.
//The 'set' parameter is used to specify if the first set of 
// 700 images should be downloaded, or the next 700 
// This is because the browser* crashes when 
// compressing more than 700 at once. 

//  * - using Chrome, and my computer that has a huge amount of RAM
// the 700 may or may not need to be decreased depending on the system used...

//ini_set('display_errors', 1);

//Yeah... this was originally necessary
// when I was trying to get all data, not just for one user..
// not sure if it's needed anymore but why not?
ini_set('memory_limit', '1000M');
//error_reporting(-1);

require_once 'db.php';

function getMarkData($author, $set) {

  $conn = db_connect();

  $stmt = null;
  if($set == 1) {
	  $stmt = $conn->prepare("SELECT * FROM MarkedData WHERE author = ? ORDER BY mark_id LIMIT 700");
  }
  else{
	  //The 'Limit 700, 700' means skip the first 700 rows, return the next 700 
	  $stmt = $conn->prepare("SELECT * FROM MarkedData WHERE author = ? ORDER BY mark_id LIMIT 700, 700");
  }
  
  $stmt->bind_param("s", $author);
  $stmt->execute();
  $res = $stmt->get_result();
  if ($res === null)
    return null;

  $mark_data = array();
  
  while ($row = $res->fetch_assoc()) {
	  array_push($mark_data, array("mark_id" => $row['mark_id'], "image_id"=> $row['image_id'], "path"=> $row['path'], "author" => $row['author']) );
  }
  
  $stmt->close();

  return $mark_data;
}

try {
  echo json_encode(getMarkData($_GET['author'], $_GET['set']));
}
catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
