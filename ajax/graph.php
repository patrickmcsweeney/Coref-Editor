<?php	
	if (array_key_exists('uri', $_POST))
		$uri = $_POST['uri'];
	else if(array_key_exists('uri', $_GET))
		$uri = $_GET['uri'];
	else
		exit();

	if (! is_string($uri))
		exit();
	define('CAN_SERVE_RDFXML', false);
//require_once '../inc/functions.php';

	require_once '/usr/lib/rkb/functions-global.inc.php';
	require_once 'functions-rkb.inc.php';
	require_once 'functions-crs.inc.php';

	$store = 'test2';
	$uri = '<http://test2.rkbexplorer.com/id/a>';

	//$store = 'data_southampton';
	//$uri = '<http://southampton.rkbexplorer.com/id/person-00021>';


	//  connect to CRS and directly to dbase
	$crs = new CRS3('localhost', 'crs3_' . $store);
	$db = mysql_connect('localhost', 'rdf', 'rdf');
	mysql_select_db('crs3_' . $store);

	//  find all merges that involved one of the URIs in this bundle	
	$equivs = $crs->getSameAs($uri);
	$canon  = $crs->findCanon($uri); 
	$bundle = $crs->__getBundleForURI($uri); 
	$hash2uri = array();
	$merges = array();
	foreach($equivs as $u) {
		$h = $crs->__hashURI($u) + 0;
		$hash2uri[$h] = $u;
		$q = "	SELECT data1, data2, data3, data4, item as bundleID FROM history 
			WHERE action = 'merge' 
			AND data4 = $h";
		$r = mysql_query($q) or die(mysql_error());
		while ($row = mysql_fetch_assoc($r)) $merges[] = $row;
	}

	//  check to see if any of those merges have subsequently been un-done
	//  and remove them from $merges if so. if we find data that is not in
	//  hash2uri then these are deprecated URIs -- ignore them :)
	//  TODO but not sure what happens if they form part of a link chain?!
	$mappings = array();
	foreach($merges as $index => $row) {

		//  check for deprecation
		if (!isset($hash2uri[$row['data3']])) continue;
		if (!isset($hash2uri[$row['data4']])) continue;

		//  check for direct bundle un-merges
		$q = "SELECT * FROM history WHERE action='split' AND item = {$row['bundleID']}";
		$r = mysql_query($q) or die(mysql_error());
		if (mysql_num_rows($r) != 0) continue;

		//  check for unmerges of things "above" an unmerge
		//  going back up the history tree
		$q = "SELECT * FROM history WHERE action = 'split' AND data3 = {$row['data1']} AND data4 = {$row['data2']}";
		$r = mysql_query($q) or die(mysql_error());
		if (mysql_num_rows($r) != 0) continue;

		//  ok, we like this one. store in mapping A->B and B->A
		//print $hash2uri[$row['data3']] . ' --> ' . $hash2uri[$row['data4']] . "\n";
		$indexA = array_search($hash2uri[$row['data3']], $equivs);
		$indexB = array_search($hash2uri[$row['data4']], $equivs);
		if (!isset($mappings[$indexA])) $mappings[$indexA] = array();
		if (!isset($mappings[$indexB])) $mappings[$indexB] = array();
		$mappings[$indexA][] = $indexB;
		$mappings[$indexB][] = $indexA;
		
	}

	/*
	
	right, we now have a valid set of merges :)
	output json. the format is as follows...
	(without the // comments, obviously!)

	[
	    12345,	// this is the bundleID
	    2,		// this is an index in following array identifying canon as id/c
	    [
		"http://test.rkbexplorer.com/id/a",	// the uris in this bundle, indexed from 0 .. 3
		"http://test.rkbexplorer.com/id/b",
		"http://test.rkbexplorer.com/id/c",
		"http://test.rkbexplorer.com/id/d"
	    ],
	    [
		[
		    1,		//  uri[0] links to uri[1]	a--b
		    2		//  uri[0] links to uri[2]	a--c
		],
		[
		    0,		//  uri[1] links to uri[0]	b--a
		    3		//  uri[1] links to uri[3]	b--d
		],
		[
		    0		//  uri[2] links to uri[0]	c--a
		],
		[
		    1		//  uri[3] links to uri[1]	d--b
		]
	    ]
	]
	
	
	clear as mud, hey?	
	*/



	//  output
	header("Content-type: application/json");
	$c = count($equivs);
	print "[\n";
	print "  $bundle,\n";
	print "  " . array_search($canon, $equivs) . ",\n";
	print "  [\n";
	for ($i = 0; $i < $c; $i++) {
		print "    \"" . substr($equivs[$i], 1, -1) . "\"";
		print ($i < $c - 1) ? ",\n" : "\n";
	}
	print "  ],\n";
	print "  [\n";
	for ($i = 0; $i < $c; $i++) {
		print "    [\n";	
		if (isset($mappings[$i])) {
			//sort($mappings[$i]);
			for ($j = 0; $j < count($mappings[$i]); $j++) {
				print "      {$mappings[$i][$j]}";			
				print ($j < count($mappings[$i]) - 1) ? ",\n" : "\n";
			}
		}
		print ($i < $c - 1) ? "    ],\n" : "    ]\n";
	}
	print "  ]\n]\n\n";
	

