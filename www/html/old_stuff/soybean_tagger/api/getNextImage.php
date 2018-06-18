<?php

/*
  Given an author name, this script returns the id and name of the next image 
  the user should mark
*/

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getNextImage($author)
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT Images.image_id, Images.path FROM Images WHERE Images.image_id NOT IN (SELECT image_id FROM MarkedData WHERE author = ?) LIMIT 1");
  $stmt->bind_param("s", $author);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row === null)
    return -1;  // done

  return array( "id" => $row['image_id'], "name" => $row['path']);
}

try {
  if (!isset($_GET['author']))
    throw new Exception("Missing author");

  $img = getNextImage($_GET['author']);
  $id = $img["id"];
  
  echo json_encode(array(
    "next_image" => $id,
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
