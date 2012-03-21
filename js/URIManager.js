if (typeof CRS == 'undefined') CRS = {};

CRS.URIManager = new Class({
	// URI IDs not zero-indexed for user-friendlyness
	'uris_by_id'    : [null],
	'uris_by_uri'   : {},
	
	getURI: function(uri)
	{
		// If it's already an object, just assume it's already a URI object
		if ($type(uri) == 'object')
			return uri;
			
		if (this.uris_by_uri[uri] != null)
			return this.uris_by_uri[uri];

		var id = this.uris_by_id.length;
		var obj = new CRS.URI(id, uri);
		this.uris_by_uri[uri] = obj;
		this.uris_by_id.push(obj);

		return obj;
	},
	getURIById: function(id)
	{
		return this.uris_by_id[id];
	}
});