<?php
// In PHP versions earlier than 4.1.0, $HTTP_POST_FILES should be used instead
// of $_FILES.

if($_POST['form_set']){

	if($_FILES['pictures']['size'] > 0){
		
		$upload_dir = '/var/www/html/soybean_app/corn_tagger_images';
		
		foreach ($_FILES["pictures"]["error"] as $key => $error) {
			if ($error == UPLOAD_ERR_OK) {
				
				$tmp_name = $_FILES["pictures"]["tmp_name"][$key];
				
				// basename() may prevent filesystem traversal attacks;
				// further validation/sanitation of the filename may be appropriate
				$name = basename($_FILES["pictures"]["name"][$key]);
				
				if( move_uploaded_file($tmp_name, "$dir/$name")){
					echo "Uploaded " . $name . "<br>";
				}
				else {
					echo "Failed to upload " . $name . "<br>";
				}
			}
		}
	}
}
else {
	
	?>
	<html>
	<head><title>Upload Images</title></head>
	
	<body>
		<form enctype="multipart/form-data" action="uploadImage.php" method="POST">
			<p>Pictures:<br><br>
			<input type="file" name="pictures[]" /><br><br>
			<input type="file" name="pictures[]" /><br><br>
			<input type="file" name="pictures[]" /><br><br>
			<input type="hidden" name='form_set' value=1 />
			<input type="submit" value="Send" /><br><br>
			</p>
		</form>
	</body>
	</html>
	<?php
}

?>