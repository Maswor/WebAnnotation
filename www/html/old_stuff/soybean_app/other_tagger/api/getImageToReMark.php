<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getImage($image_id)
{
  $conn = db_connect();
	
  $stmt = $conn->prepare("SELECT Images.image_id, Images.path FROM Images WHERE Images.image_id = ? LIMIT 1");
  
  $stmt->bind_param("i", $image_id);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row === null)
	return array( "id" => -1, "name" => "No image with id: " . $image_id);  // done
  
  return array( "id" => $row['image_id'], "name" => $row['path']);
}

try {
  if (!isset($_GET['image_id']))
    throw new Exception("Missing image_id");

  $img = getImage($_GET['image_id']);
  $id = $img["id"];
  
  echo json_encode(array(
    "image_id" => $id,
    "image_url" => "/api/getImage.php?id=" . $id,
	"image_name" => $img["name"]
  ));
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
