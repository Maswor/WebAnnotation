<?php


ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getMarkData()
{

  $filename = "export.csv";
  $delimiter=",";
  header('Content-Type: application/csv');
  header('Content-Disposition: attachment; filename="'.$filename.'";');

  // open the "output" stream
  // see http://www.php.net/manual/en/wrappers.php.php#refsect2-wrappers.php-unknown-unknown-unknown-descriptioq
  $f = fopen('php://output', 'w');
  
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT distinct m.image_id as image_id, m.mark_id as mark_id, m.author as author, m.path as path, m.poor_quality as poor_quality, i.path as name from MarkedData m, Images i WHERE i.image_id = m.image_id Order by mark_id;");
  //$stmt->bind_param("s", $author);
  $stmt->execute();
  $res = $stmt->get_result();
  if ($res === null)
    return null;
  
  
  while ($row = $res->fetch_assoc()) {
	  
	  $mark_id = $row['mark_id'];

	  $firstLine = array($mark_id, $row['name']);
	  fputcsv($f, $firstLine, $delimiter);
	  
	  
	  $paths = json_decode($row['path']);

	  //$path_line = array("Paths");
	  //fputcsv($f, $path_line, $delimiter);
	  
	  //foreach ($paths as $diseaseId => $diseasePaths) {
        //$key = "Disease";
		
		//$pathLine = array($key , $diseaseId);
		//fputcsv($f, $pathLine, $delimiter);
		
		$numDiseasePaths = 0;
		foreach($paths as $diseasePath){
			$numDiseasePaths++;
			$dkey = "Path";// . $numDiseasePaths;
			$diseasePathLine = array($dkey , $numDiseasePaths);
			fputcsv($f, $diseasePathLine, $delimiter);
			
			foreach($diseasePath as $diseasePathCoord){
				$coordType = $diseasePathCoord[0];
				if($coordType != "Z") {
					
					$coords = array($diseasePathCoord[1], $diseasePathCoord[2] );
					fputcsv($f, $coords, $delimiter);
				}
			}
		}
	  //$severitiesLine = array("Severities");
	  //fputcsv($f, $severitiesLine, $delimiter);
	  /*
	  $sev_stmt = $conn->prepare("SELECT disease, severity FROM Severity WHERE mark_id = ?");
	  $sev_stmt->bind_param("i", $mark_id);
	  $sev_stmt->execute();
	  $sev_res = $sev_stmt->get_result();
	  //$severities = array();
	  while ($sev_row = $sev_res->fetch_assoc()) {
		$sev_line = array($sev_row['disease'], $sev_row['severity']);
		fputcsv($f, $sev_line, $delimiter);
	  }
	  $sev_stmt->close();
	  */
	  
  }
  $stmt->close();

  fpassthru($f);
} 

try {
  getMarkData();
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
