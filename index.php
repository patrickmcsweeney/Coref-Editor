<?php
	echo '<?xml version="1.0" encoding="UTF-8"?>' ."\n";
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
	"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
	<title>dotAC CRS management UI</title>
	<!-- <meta http-equiv="refresh" content="40" /> -->
	<link rel="alternate stylesheet" href="style/main.css" type="text/css" media="screen" title="Alternate Stylesheet" charset="utf-8" />
	<link rel="stylesheet" href="style/dotAC.css" type="text/css" media="screen" title="dotAC Stylesheet" charset="utf-8" />
	<!--[if IE]><script language="javascript" type="text/javascript" src="js/lib/excanvas/excanvas.js"></script><![endif]-->
	<script src="js/lib/jit/build.js" type="text/javascript" charset="utf-8"></script>
	<!--<script src="js/lib/mootools/mootools-1.2.3-core-yc.js" type="text/javascript" charset="utf-8"></script>-->
	<!--<script src="js/lib/mootools/mootools-1.2.3.1-more-yc.js" type="text/javascript" charset="utf-8"></script>-->
	<script src="js/lib/mootools/mootools-1.2.3-core-nc.js" type="text/javascript" charset="utf-8"></script>
	<script src="js/lib/mootools/mootools-1.2.3.1-more-nc.js" type="text/javascript" charset="utf-8"></script>
	
	<noscript><meta http-equiv=refresh content="0; URL=/nojs.html" /></noscript>
	
	<!-- TODO compress these files into one for deployment -->
<?php
	require_once 'inc/functions.php';
	includeJavascriptInDir('js', array('main.js'));
?>
	<script src="js/main.js" type="text/javascript" charset="utf-8"></script>
	
</head>
<body>
	<div id="top_controls">
		<div class="left_buttons">
			<button type="button" onClick="CRS.save()" id="save_button" disabled='true' title="Save Changes">Save</button>
			<button type="button" onClick="location.reload(true)" id="reset_button" title="Discard changes, start again">Start Over</button>
		</div>

		<div id="data_input">
			<form id='data_input_form'>
				<input type="text" name="input_field" value="" id="input_field" />
				<button type="button" id='uri_button'  value='uri'>URI</button> <!-- TODO Style this button -->
				<button type="button" id='text_button' value='search'>Text Search</button> <!-- TODO Style this button -->
				<!-- <button type="button" id='demo' value='search'>Add Demo Uris</button> -->
			</form>
		</div>
		<div id='branding'>
			<a href="http://www.dotAC.info/" title="dotAC.info"><img src='/explorer/assets/img/dotAC.png' alt='dotAC.info' width='74' height='65' /></a>
		</div>
	</div>
	<div id="graph_pane">
	</div>
	<div id="info_pane">
		<div id="info_pane_left"  class='pane'></div>
		<div id="info_pane_right" class='pane'></div>
		<div id="instructions">
			Enter a URI or a Name to get started
			<br /><br /><br />
			'Smith' or 'Williams' are good text search starting points
			<br /><br />
			An example URI is http://test.rkbexplorer.com/id/333
		</div>
	</div>
	<ul id="contextmenu" style='display: none;'>
		<li id='context_connect_curr_selected'>
			<a href='#connect_curr_selected'>Add Equivalence to <span>URI X</span></a></li>
		<li id='context_connect_curr_canon'>
			<a href='#connect_curr_canon'   >Add Equivalence to Canon of <span>URI X</span></a></li>
		<li id='context_connect_prev_selected' class='separator'>
			<a href='#connect_prev_selected'>Add Equivalence to <span>URI X</span></a></li>
		<li id='context_connect_prev_canon'>
			<a href='#connect_prev_canon'   >Add Equivalence to Canon of <span>URI X</span></a></li>

		<!--
		Lines similar to the following are inserted here:
		<li class='context_disconnect'><a href='#disconnect_X'>Disconnect from URI X</a></li>
		-->
		<li id='context_isolate' class='separator'><a href='#isolate'>Isolate URI</a></li>
		<li id='remove_bundle'><a href='#remove'>Remove Bundle</a></li>
	</ul>
    <div id="footer">
      <p><a href="mailto:contact@dotAC.info">contact@dotAC.info</a><br/><a href="http://www.ecs.soton.ac.uk/">Electronics and Computer Science</a> · <a href="http://www.southampton.ac.uk/">University of Southampton</a></p>
    </div>
  </body>
</html>
