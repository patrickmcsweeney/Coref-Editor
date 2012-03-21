<?php
function get_param($param){
	if (array_key_exists($param, $_POST)){
		return $_POST[$param];
	}else if(array_key_exists($param, $_GET)){
		return $_GET[$param];
	}else{
		return NULL;
	}
}
?>
