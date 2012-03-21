if (typeof CRS == 'undefined') CRS = {};

CRS.Bundle = new Class({
	'id'    : null,
	'canon' : null,
	'active': true,
	'uris'  : [],

	initialize: function(id, canon, uris)
	{
		this.id = id;
		this.canon = canon;
		this.uris = uris;
	}
});

// Bug in mootools prevents this from being supplied in the class map.
CRS.Bundle.prototype.toString = function()
{
	return "Bundle " + this.id + ' [' + this.uris.toString() + ']';
};

CRS.URI = new Class({
	'id' : null,
	'value': null,
	'bundle': null,
	'equivalences': {},
	
	initialize: function(id, uri)
	{
		this.id = id;
		this.value = uri;
	}
});

// Bug in mootools prevents this from being supplied in the class map.
CRS.URI.prototype.toString = function()
{
	return this.value;
};