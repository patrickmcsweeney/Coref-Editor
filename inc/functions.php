<?
require_once('/usr/lib/rkb/functions-global.inc.php');
require_once('functions-rkb.inc.php');

function includeJavascriptInDir($dir, $except = array())
{
	if (is_string($except))
		$except = array($except);
		
	$dh  = opendir($dir);
	while (false !== ($file = readdir($dh))) {
		if (array_search($file, $except) !== FALSE)
			continue;

		if (substr($file, -3) != '.js')
			continue;

		echo "\t<script src='$dir/$file' type='text/javascript' charset='utf-8'></script>\n";
	}
}

function my_collapseNS($uri, $entityNotNamespace=false) {
	global $NS, $NS_PREFIX;
	initNamespaces();
	
	$new_uri = str_replace($NS, $NS_PREFIX, $uri);

	if ($entityNotNamespace && $new_uri != $uri) $new_uri = preg_replace('/^(.*?):/', '&\1;', $new_uri);

	return $new_uri;
}

function getLiteralsForUri($uri)
{
	$literals = array();
	$uri = '<'.$uri.'>';
	
	$results = mq("SELECT DISTINCT * WHERE { $uri ?p ?o FILTER isLITERAL(?o) }");
	foreach ($results as $match) {
		$literal = $match['o'];
		//if (($p = strpos($literal, '^^http://www.w3.org/2001/XMLSchema#string')) !== false) $literal = substr($literal, 0, $p);
		$pred = stripBothEnds($match['p']);
		
		$literals[$pred][] = $literal;
	}

	return $literals;
}

function sortLiteralsByPredicate(& $literals)
{
	ksort($literals);
}

function getPredicateAbbreviations($predicates)
{
	$out = array();
	foreach ($predicates as $pred) {
		$out[$pred] = my_collapseNS($pred);
	}
	return $out;
}

function getLabelsForURIs($uris)
{
	initNamespaces();
	
	$labels = array();
	foreach ($uris as $uri) {
		$label = getLabel("<$uri>", true);
		if ($label != null)
			$labels[$uri] = $label;
	}
	return $labels;
}



// Can has PHP5 ?
if (!function_exists('json_encode'))
{
	function json_encode($a=false)
	{
		if (is_null($a)) return 'null';
		if ($a === false) return 'false';
		if ($a === true) return 'true';
		if (is_scalar($a))
		{
			if (is_float($a))
			{
				// Always use "." for floats.
				return floatval(str_replace(",", ".", strval($a)));
			}

			if (is_string($a))
			{
				static $jsonReplaces = array(array("\\", "/", "\n", "\t", "\r", "\b", "\f", '"'), array('\\\\', '\\/', '\\n', '\\t', '\\r', '\\b', '\\f', '\"'));
				return '"' . str_replace($jsonReplaces[0], $jsonReplaces[1], $a) . '"';
			}
			else
				return $a;
		}
		$isList = true;
		for ($i = 0, reset($a); $i < count($a); $i++, next($a))
		{
			if (key($a) !== $i)
			{
				$isList = false;
				break;
			}
		}
		$result = array();
		if ($isList)
		{
			foreach ($a as $v) $result[] = json_encode($v);
			return '[' . join(',', $result) . ']';
		}
		else
		{
			foreach ($a as $k => $v) $result[] = json_encode($k).':'.json_encode($v);
			return '{' . join(',', $result) . '}';
		}
	}
}
