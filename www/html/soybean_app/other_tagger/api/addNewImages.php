<?php

require_once "db.php";

$really_do = $_GET['ok'];

$imgdir = '/var/www/html/soybean_app/other_tagger/images/';
$Directory = new RecursiveDirectoryIterator($imgdir);
$Iterator = new RecursiveIteratorIterator($Directory);
$Regex = new RegexIterator($Iterator, '/^.+\.png$/i', RecursiveRegexIterator::GET_MATCH);

// this is hella slow (using two statements for every image),
// but this script should only run very rarely and it's simple
// did i say simple i meant 10pm
$conn = db_connect();

$insert_stmt = $conn->prepare("INSERT INTO Images (path) VALUES (?)");
$exists_stmt = $conn->prepare("SELECT EXISTS(SELECT 1 FROM Images WHERE path = ?) as e");

foreach ($Regex as $f)
{
  $abs_path = $f[0];
  $rel_path = substr($abs_path, strlen($imgdir));  // chop off $imgdir

  echo $rel_path . "<br/>";

  $exists_stmt->bind_param("s", $rel_path);
  $exists_stmt->execute();
  $res = $exists_stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row['e'] == 1) {
    echo "----duplicate<br/>";
    continue;
  }

  if ($really_do)
  {
    $insert_stmt->bind_param("s", $rel_path);
    $insert_stmt->execute();
  }
}

if ($really_do) {
  echo "<br/><br/>Completed successfully.";
} else {
  // Link to this page with ?ok=1 added to it
  echo "<br/><br/><a href=\"" . $_SERVER['REQUEST_URI'] . "?ok=1\">Really add all files?</a>";
}

?>
