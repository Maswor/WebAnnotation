<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getPrevImage($author)
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT Images.orderIndex, Images.path FROM Images WHERE Images.image_id NOT IN (SELECT image_id FROM MarkedData WHERE author = ?) ORDER BY orderIndex LIMIT 1");
  $stmt->bind_param("s", $author);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row === null)  // no "current image" found, can happen when user has finished marking every image
    $prev_orderIndex = 999999999;  // every image is less than 999999
  else
    $prev_orderIndex = $row['orderIndex'];
	
	
	
  $stmt = $conn->prepare("SELECT Images.image_id, Images.path FROM Images WHERE Images.orderIndex  < ? ORDER BY orderIndex  desc LIMIT 1");
  
  $stmt->bind_param("i", $prev_orderIndex);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row === null)
	return array( "id" => -1, "name" => "error getting previous order index");  // done
  
  return array( "id" => $row['image_id'], "name" => $row['path']);
}

try {
  if (!isset($_GET['author']))
    throw new Exception("Missing author");

  $img = getPrevImage($_GET['author']);
  $id = $img["id"];
  
  echo json_encode(array(
    "prev_image" => $id,
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
