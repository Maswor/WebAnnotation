<?php


ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';


//area algorithm from : http://www.mathopenref.com/coordpolygonarea2.html
function getMarkData()
{

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

  $stmt = $conn->prepare("SELECT m.mark_id as mark_id, m.image_id as image_id, m.author as author, m.path as path, m.poor_quality as poor_quality, i.path as name FROM MarkedData m, Images i where i.image_id = m.image_id AND m.author = 'David' AND m.image_id IN (SELECT image_id FROM MarkedData WHERE author='Jae') ORDER BY mark_id");
  //$stmt->bind_param("s", $author);
  $stmt->execute();
  $res = $stmt->get_result();
  if ($res === null)
    return null;
  
  
  $maxNumPaths = 0;
  while ($row = $res->fetch_assoc()) {
	  
	  $mark_id = $row['mark_id'];
	  $name = $row['name'];
	  
	   $pq = $row['poor_quality'];
	  
	   if($pq == 1){
		   $dataLine = array($mark_id, $diseaseStr, 9, "Path", $name, "Area", 0, "Severity", 0);
		   array_push($dataLines, $dataLine);
		   continue;
	   }
	  
	  $paths = json_decode($row['path']);
	  
	  $hasPaths = 0;
	  $numDiseases = 0;
	  foreach ($paths as $diseaseId => $diseasePaths) {
		  $numDiseases++;
		  
		  if($numDiseases == 2){
			  continue;
			  //array_pop($dataLines);
		  }
		  
		$hasPaths = 1;
		
		$numDiseasePaths = 0;
		$diseaseAreas = array();
	
		foreach($diseasePaths as $diseasePath){
			
			$numDiseasePaths++;
			
			$pathArea = 0;
			
			if(count($diseasePath) < 2){
				continue;
			}
			
			$xj = $diseasePath[count($diseasePath) - 2][1];
			$yj = 512 - $diseasePath[count($diseasePath) - 2][2];
			
			foreach($diseasePath as $diseasePathCoord){
				$coordType = $diseasePathCoord[0];
				
				if($coordType != "Z") {
					$xi = $diseasePathCoord[1];
					$yi = 512 - $diseasePathCoord[2];
					
					$pathArea += ($xj + $xi) * ($yj - $yi);
					$xj = $xi;
					$yj = $yi;
				}
			}
			
			$pathArea = abs($pathArea / 2);
			
			array_push($diseaseAreas, $pathArea);
		}
		
		$totalArea = 0;
		foreach($diseaseAreas as $area){
			$totalArea += $area;
		}
		
		//Get severities:
		$sevStmt = $conn->prepare("Select severity from Severity where mark_id = ? and disease = ?");
		$sevStmt->bind_param("ii", $mark_id, $diseaseId);
		
		$sevStmt->execute();
		$sev_res = $sevStmt->get_result();
		
		$obj = $sev_res->fetch_assoc();
		$severity = $obj['severity'];
		$sevStmt->close();
		
		$dataLine = array($mark_id, $diseaseStr, $diseaseId, "Path", $name, "Area", $totalArea, "Severity", $severity);

		array_push($dataLines, $dataLine);
      }
	  
	  if($numDiseases > $maxNumPaths){
		  $maxNumPaths = $numDiseases;
	  }
	  
	  if($hasPaths == 0){
		$dataLine = array($mark_id, $diseaseStr, 0, "Path", $name, "Area", 0, "Severity", 0);

		array_push($dataLines, $dataLine);
	  }
	  
  }
  $stmt->close();
  
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

try {
  getMarkData();
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
