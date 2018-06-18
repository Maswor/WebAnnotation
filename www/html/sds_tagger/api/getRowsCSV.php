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

  $stmt = $conn->prepare("SELECT m.mark_id as mark_id, m.image_id as image_id, m.author as author, m.path as path, m.poor_quality as poor_quality, i.path as name FROM MarkedData m, Images i where i.image_id = m.image_id AND m.author = 'David'");
  //$stmt->bind_param("s", $author);
  $stmt->execute();
  $res = $stmt->get_result();
  if ($res === null)
    return null;
  
  
  while ($row = $res->fetch_assoc()) {
	  
	  $mark_id = $row['mark_id'];

	  //$firstLine = array($mark_id, $row['image_id'], $row['name'], $row['author'], $row['poor_quality']);
	  //fputcsv($f, $firstLine, $delimiter);
	  
	   $pq = $row['poor_quality'];
	  
	   if($pq == 1){
		  // $pqLine = array("poor_quality");
		  // fputcsv($f, $pqLine, $delimiter);
		   continue;
	   }
	  
	  $paths = json_decode($row['path']);

	  $path_line = array("Paths");
	  //fputcsv($f, $path_line, $delimiter);
	  
	  foreach ($paths as $diseaseId => $diseasePaths) {
        $diseaseStr = "Disease";
		$indexStr = "Index";
		
		//$pathLine = array($key , $diseaseId);
		//fputcsv($f, $pathLine, $delimiter);
		
		$numDiseasePaths = 0;
		foreach($diseasePaths as $diseasePath){
			$numDiseasePaths++;
			
			//$diseasePathLine = array($dkey , $numDiseasePaths);
			//fputcsv($f, $diseasePathLine, $delimiter);
			
			$numRows = 0;
			foreach($diseasePath as $diseasePathCoord){
				$coordType = $diseasePathCoord[0];
				if($coordType != "Z") {
					$numRows++;
					//$coords = array($diseasePathCoord[1], $diseasePathCoord[2] );
					//fputcsv($f, $coords, $delimiter);
				}
			}
			
			$dataLine = array($mark_id, $diseaseStr, $diseaseId, $indexStr, $numDiseasePaths, "Rows", $numRows);
			
			fputcsv($f, $dataLine, $delimiter);
		}
      }
	  /*
	  $severitiesLine = array("Severities");
	  fputcsv($f, $severitiesLine, $delimiter);
	  
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
