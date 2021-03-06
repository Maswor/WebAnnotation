<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';
require_once 'config.php';

// returns path on the file system
// not URL!
function getImagePath($id)
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT path FROM Images WHERE image_id = ?");
  $stmt->bind_param("i", $id);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row === null)
    throw new Exception("Unknown ID");

  $imgdir = CONFIG["images"]["image_dir"];  // MUST end with a slash! TODO assert
  return $imgdir . $row['path'];
}

try {
  if (!isset($_GET['id']))
    throw new Exception("Missing id");

  // this is subpar...but it works
  $path = getImagePath($_GET['id']);
  header("Content-Type: image/jpeg");
  readfile($path);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
