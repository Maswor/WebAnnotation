<?php

	$directory = "images/";

	$structure = array();
	
	$files = scandir($directory); 
	foreach($files as $file)
	{
		if(is_file($directory.$file)){
			$structure[] = $file;
		}
	}

	print json_encode($structure);
	exit();

?>