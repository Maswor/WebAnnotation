<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getPrevImage($author)
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT image_id FROM MarkedData WHERE author = ? ORDER BY image_id DESC LIMIT 1");
  $stmt->bind_param("s", $author);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();

  if ($row === null)  // no previous found, throw exception
    return array( "id" => -1, "name" => "error getting previous order index");  // done
  else
    $image_id = $row['image_id'];

  $stmt = $conn->prepare("SELECT path from Images WHERE image_id = ?");
  $stmt->bind_param("i", $image_id);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row === null)
    return array( "id" => -1, "name" => "error getting previous order index");  // done
  $path = $row['path'];

  return array( "id" => $image_id, "name" => $path);
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
