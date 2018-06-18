<?php


ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';


//area algorithm from : http://www.mathopenref.com/coordpolygonarea2.html
function getMarkData($author_to_retrieve, $set)
{

  $AUTHOR = $author_to_retrieve;
  $filename = strtolower($author_to_retrieve) . "_multi" . $set . ".csv";
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
  
  $imagesStmt = $conn->prepare("SELECT i.image_id as image_id FROM Images i where 2 < (SELECT count(*) from MarkedData m where m.image_id = i.image_id);");
  $imagesStmt->execute();
  $imagesRes = $imagesStmt->get_result();
  
  while($imageRow = $imagesRes->fetch_assoc()){
	  $image_id = $imageRow['image_id'];
	  
	  
	  $image_data = array();
	  $arti_arr = array();
	  $jae_arr = array();
	  $david_arr = array();
	  
	  $authorsStmt = $conn->prepare("SELECT m.mark_id as mark_id, m.image_id as image_id, m.author as author, m.path as path, i.path as name, m.poor_quality as poor_quality FROM MarkedData m, Images i where i.image_id = m.image_id AND i.image_id = ?");
	  $authorsStmt->bind_param("i", $image_id);
	  $authorsStmt->execute();
	  $authorsRes = $authorsStmt->get_result();
	  
	  while($authorRow = $authorsRes->fetch_assoc()) {
		  
		  $author = $authorRow['author'];
		  $mark_id = $authorRow['mark_id'];
		  $name = $authorRow['name'];
		  
		  if($authorRow['poor_quality'] == 1){
			  continue;
		  }
		  
		  $paths = json_decode($authorRow['path']);
		
		  $hasPaths = 0;
		  $numDiseases = 0;
		  foreach ($paths as $diseaseId => $diseasePaths) {
			  
			  $numDiseases++;
			  
			  
			  //if($numDiseases == 2){
				//  array_pop($dataLines);
				  //continue;
			  //}
			  
			  
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
			
			//$dataLineArr = array($author => array($mark_id, $diseaseStr, $diseaseId, "Path", $name, "Area", $totalArea, "Severity", $severity));
			//array_push($image_data, $dataLineArr);
			
			$dataLine = array($mark_id, $diseaseStr, $diseaseId, "Path", $name, "Area", $totalArea, "Severity", $severity);
			if($author == 'Arti'){
				array_push($arti_arr, $dataLine);
			}
			else if($author == 'David'){
				array_push($david_arr, $dataLine);
			}
			else {
				array_push($jae_arr, $dataLine);
			}
			
			//array_push($dataLines, $dataLine);
			
			
		 }
		 if($hasPaths == 0){
			//$dataLineArr = array($author => array($mark_id, $diseaseStr, 0, "Path", $name, "Area", 0, "Severity", 0));
			//array_push($image_data, $dataLineArr);
			
			$dataLine = array($mark_id, $diseaseStr, 0, "Path", $name, "Area", 0, "Severity", 0);
			if($author == 'Arti'){
				array_push($arti_arr, $dataLine);
			}
			else if($author == 'David'){
				array_push($david_arr, $dataLine);
			}
			else {
				array_push($jae_arr, $dataLine);
			}
		 }
	  
	 }
	 
	 //if(count($image_data) == 3){
	if(!(count($jae_arr) == 1 && count($david_arr) == 1 && count($arti_arr) == 1)){
		 /*foreach($image_data as $arr){
			 if(array_key_exists($AUTHOR, $arr)){
				  array_push($dataLines, $arr[$AUTHOR]);
			 }
		 }*/
		 if($AUTHOR == 'Arti'){
				//foreach($arti_arr as $dataLine)
				if(($set == 1 && count($arti_arr) > 0) || count($arti_arr) == 1){
					array_push($dataLines, $arti_arr[0]);
				}
				else if($set == 2 && count($arti_arr) == 2){
					array_push($dataLines, $arti_arr[1]);
				}
			}
			else if($AUTHOR == 'David'){
				//foreach($david_arr as $dataLine)
				if(($set == 1 && count($david_arr) > 0) || count($david_arr) == 1){
					array_push($dataLines, $david_arr[0]);
				}
				else if($set == 2 && count($david_arr) == 2){
					array_push($dataLines, $david_arr[1]);
				}
			}
			else {
				//foreach($jae_arr as $dataLine)
				if(($set == 1 && count($jae_arr) > 0) || count($jae_arr) == 1){
					array_push($dataLines, $jae_arr[0]);
				}
				else if($set == 2 && count($jae_arr) == 2){
					array_push($dataLines, $jae_arr[1]);
				}
			}
	 }
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
	echo "<a href='getMultipleDiseases.php?author=Arti&set=1'>Get Arti's 1st data</a><br><br>";
	echo "<a href='getMultipleDiseases.php?author=Arti&set=2'>Get Arti's 2nd data</a><br><br>";
	echo "<a href='getMultipleDiseases.php?author=David&set=1'>Get David's 1st data</a><br><br>";
	echo "<a href='getMultipleDiseases.php?author=David&set=2'>Get David's 2nd data</a><br><br>";
	echo "<a href='getMultipleDiseases.php?author=Jae&set=1'>Get Jae's 1st data</a><br><br>";
	echo "<a href='getMultipleDiseases.php?author=Jae&set=2'>Get Jae's 2nd data</a><br><br>";
}
else {
	try {
	  getMarkData($_GET['author'], $_GET['set']);
	} catch (Exception $e) {
	  http_response_code(500);
	  echo json_encode(array(
		"errorMessage" => $e->getMessage()
	  ));
	}
}

?>
