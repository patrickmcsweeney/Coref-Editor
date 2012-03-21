<?php

/*if (array_key_exists('uri', $_POST))
	$uri = $_POST['uri'];
else if(array_key_exists('uri', $_GET))
	$uri = $_GET['uri'];
else
	exit();

if (! is_string($uri))
	exit();
*/
$uri1 = $_GET['uri1'];
$uri2 = $_GET['uri2'];
// This fixes some mime-type sniffing fail in functions-global.php
define('CAN_SERVE_RDFXML', false);
require_once '../inc/functions.php';
// $QUERY_DEBUG = true;

require_once 'crs3/crs3.class.php';

// Connect to the DB!
$crs = new CRS3('localhost', 'crs3_test');
//$crs = new CRS3('localhost', 'crs3_ibm');
//$crs = new CRS3('localhost', 'crs3_dblp');

$crs->mergeURIs($uri1,$uri2,"from dotACui",time());
