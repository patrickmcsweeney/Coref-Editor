<?php

if (array_key_exists('uri', $_POST))
	$uri = $_POST['uri'];
else if(array_key_exists('uri', $_GET))
	$uri = $_GET['uri'];
else
	exit();

if (! is_string($uri))
	exit();
	
// This fixes some mime-type sniffing fail in functions-global.php
define('CAN_SERVE_RDFXML', false);
require_once '../inc/functions.php';

// $QUERY_DEBUG = true;

$literals = getLiteralsForUri($uri);
sortLiteralsByPredicate($literals);

$json = $literals;

header('Content-Type: application/json');
echo json_encode($json);
