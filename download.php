<?php

if (isset($_POST["video-filename"])) {

	$fileName = $_POST["video-filename"];
	$uploadDirectory = dirname(__FILE__).'/downloads/'.$fileName;

	if (!move_uploaded_file($_FILES["video-blob"]["tmp_name"], $uploadDirectory)) {
        echo(" problem moving uploaded file");
    }

	echo('/downloads/'.$fileName);
}

?>