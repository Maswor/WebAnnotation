<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function putData($image_id, $author, $paths, $severities, $is_poor_quality)
{
  $conn = db_connect();

  $pq = 0;
  if($is_poor_quality) {
	$pq = 1;
  }
  
  //Check if already something in database for this image:
  $stmt = $conn->prepare("SELECT mark_id FROM MarkedData WHERE image_id = ? AND author = ?");
  $stmt->bind_param("is", $image_id, $author);
  $stmt->execute();
  
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  
  //Nothing there, insert as usual
  if ($row === null) {
  
	  $stmt = $conn->prepare("INSERT INTO MarkedData (image_id, author, path, poor_quality) VALUES (?, ?, ?, ?)");
	  $stmt->bind_param("issi", $image_id, $author, $paths, $pq);
	  $stmt->execute();

	  $mark_id = $stmt->insert_id;
	  if ($mark_id <= 0)
		throw new Exception("error inserting into MarkedData");

	  $stmt->close();

	  $stmt = $conn->prepare("INSERT INTO Severity (mark_id, disease, severity) VALUES (?, ?, ?)");
	  foreach ($severities as $kv) {
		// get the {"1": 42} into $disease and $sev
		// this is pretty jank
		foreach ($kv as $disease => $sev){
		$stmt->bind_param("iii", $mark_id, $disease, $sev);
		$stmt->execute();
		}
	  }

	  $stmt->close();

	  return $mark_id;
  }
  
  //Means user already marked this image, need to update
  else {
	  //Update marked data entry:
	  $stmt = $conn->prepare("UPDATE MarkedData SET path = ?, poor_quality = ? WHERE image_id = ? AND author = ?");
	  $stmt->bind_param("siis", $paths, $pq, $image_id, $author);
	  $stmt->execute();
	  $stmt->close();
	  
	  $mark_id = $row['mark_id'];
	  
	  //Remove all severities associated with old marking
	  $stmt = $conn->prepare("DELETE FROM Severity WHERE mark_id = ?");
	  $stmt->bind_param("i", $mark_id);
	  $stmt->execute();
	  $stmt->close();

	  //Add new severities:
	  $stmt = $conn->prepare("INSERT INTO Severity (mark_id, disease, severity) VALUES (?, ?, ?)");
	  foreach ($severities as $kv) {
		// get the {"1": 42} into $disease and $sev
		// this is pretty jank
		foreach ($kv as $disease => $sev){
		$stmt->bind_param("iii", $mark_id, $disease, $sev);
		$stmt->execute();
		}
	  }

	  $stmt->close();

	  return $mark_id;
  }
}

$body = file_get_contents('php://input');
$body = json_decode($body, true);

try {
  $mark_id = putData($body['image_id'], $body['author'], $body['paths'], $body['severities'], $body['poor_quality']);
  echo json_encode(array(
    "mark_id" => $mark_id
  ));
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array ("errorMessage" => $e->getMessage()));
}

?>
