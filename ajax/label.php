<?php

if (array_key_exists('uris', $_POST))
	$uris = $_POST['uris'];
else if(array_key_exists('uris', $_GET))
	$uris = $_GET['uris'];
else if (array_key_exists('uri', $_POST))
	$uris = array($_POST['uri']);
else if(array_key_exists('uri', $_GET))
	$uris = array($_GET['uri']);
else
	exit();

if (! is_array($uris))
	exit();
	
// This fixes some mime-type sniffing fail in functions-global.php
define('CAN_SERVE_RDFXML', false);
require_once '../inc/functions.php';
// $QUERY_DEBUG = true;

$json = getLabelsForURIs($uris);

echo json_encode($json);