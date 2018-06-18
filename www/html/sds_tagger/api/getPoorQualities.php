<?php


ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';


function getMarkData($author_to_retrieve)
{

  $AUTHOR = $author_to_retrieve;
  $filename = "export.csv";
  $delimiter=",";
  $diseaseStr = "Disease";
  $indexStr = "Index";
  
  $dataLines = array();
		
  header('Content-Type: application/csv');
  header('Content-Disposition: attachment; filename="'.$filename.'";');

  // open the "output" stream
  // see http://www.php.net/manual/en/wrappers.php.php#refsect2-wrappers.php-unknown-unknown-unknown-descriptioq
  $f = fopen('php://output', 'w');
  
  $conn = db_connect();
  
  $imagesStmt = $conn->prepare("SELECT m.mark_id as mark_id, m.image_id as image_id, m.path as path, m.poor_quality as poor_quality, i.path as name FROM MarkedData m, Images i where m.poor_quality = 1 AND i.image_id = m.image_id AND m.author = ? AND m.image_id IN (SELECT image_id FROM MarkedData WHERE author='Jae') ORDER BY mark_id;");
  $imagesStmt->bind_param("s", $AUTHOR);
  $imagesStmt->execute();
  $imagesRes = $imagesStmt->get_result();
  
  while($imageRow = $imagesRes->fetch_assoc()){
	  $image_id = $imageRow['image_id']; 
	  $mark_id = $imageRow['mark_id'];
	  $name = $imageRow['name'];
		  
	  $dataLine = array($mark_id, $diseaseStr, 9, "Path", $name, "Area", 0, "Severity", 0);
	  array_push($dataLines, $dataLine);
  }
  
  $imagesStmt->close();
  
  usort($dataLines, "dataCompare");
  foreach($dataLines as $dataLine){
	  fputcsv($f, $dataLine, $delimiter); 
  }
  
  //echo count($dataLines);
  fpassthru($f);
}

function dataCompare($a, $b)
{
    if ($a[2] == $b[2]) {
        return ($a[4] < $b[4]) ? -1 : 1;
    }
    return ($a[2] < $b[2]) ? -1 : 1;
}

if(!isset($_GET['author'])){
	echo "<a href='getPoorQualities.php?author=Arti'>Get Arti's data</a><br><br>";
	echo "<a href='getPoorQualities.php?author=David'>Get David's data</a><br><br>";
	echo "<a href='getPoorQualities.php?author=Jae'>Get Jae's data</a><br><br>";
}
else {
	try {
	  getMarkData($_GET['author']);
	} catch (Exception $e) {
	  http_response_code(500);
	  echo json_encode(array(
		"errorMessage" => $e->getMessage()
	  ));
	}
}

?>
