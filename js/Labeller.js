if (typeof CRS == 'undefined') CRS = {};

CRS.Labeller = new Class({
	// Map of prefix to URI
	'_prefix_map_prefix': {},
	// Map of URI to prefix
	'_prefix_map_uri': {},
	// Map of URI to label
	'_label_map': {},

	// ID of the interval function which checks the request queue
	'_periodical_id': null,

	// Array of uris waiting for a label
	'_request_queue'  : [],
	// Map of uri to Array of callback functions
	'_waiting'    : {},
	// Map of uri to current AJAX requests.
	'_requests': {},
	
	/**
	 * Set a prefix mapping
	 *
	 * @param prefix <String> prefix identifier
	 * @param uri    <String> URI equivalence
	 */
	setPrefix: function(prefix, uri)
	{
		this._prefix_map_prefix[prefix] = uri;
		this._prefix_map_uri[uri] = prefix;
	},
	
	/**
	 * Set the label for a URI
	 *
	 * @param uri   <String> The URI to assign a label to e.g.: 'http://www.aktors.org/ontology/portal#full-name'
	 * @param label <String> The label to assign. e.g.: 'Full Name'
	 */
	setLabel: function(uri, label)
	{
		this._label_map[uri] = label;
	},
	
	/**
	 * Set the label for a prefixed URI
	 *
	 * @param uri   <String> The abbreviated URI to assign a label to. e.g.: 'aktp:full-name'
	 * @param label <String> The label to assign. e.g.: 'Full Name'
	 */
	setLabelPrefixed: function(uri, label)
	{
		uri = this.expand(uri);
		
		this.setLabel(uri, label);
	},
	
	/**
	 * Retrieve the Label for a given URI
	 *
	 * @param uri        <String>   The URI to label
	 * @param [callback] <Function> Optional. If present will be invoked with the parameters
	 *                              (<String> uri, <String> label) once the label is retrieved.
	 * @return If no callback given: <String> The label of the URI, or null. Otherwise <Labeller> 'this'.
	 */
	label: function(uri, callback)
	{
		if (callback == null)
			return this._label_map[uri];
		
		if (this._label_map[uri] != null)
			callback.apply(null, [uri, this._label_map[uri]]);
		
		if (this._periodical_id == null)
			this._periodical_id = this._checkRequests.periodical(500, this);
		
		if (this._waiting[uri] == null)
			this._waiting[uri] = [];
		
		// don't re-queue this uri if a request is in progress.
		if (this._requests[uri] == null)
			this._request_queue.push(uri);
		
		this._waiting[uri].push(callback);
		
		return this;
	},
	
	/**
	 * Abbreviate a URI by the stored prefixes
	 *
	 * @param uri <String> The URI to abbreviate.
	 * @return <String> The abbreivation of the URI.
	 */
	abbreviate: function (uri)
	{
		uri = uri.toString();
		
		for (var prefix in this._prefix_map_prefix) {
			var prefix_uri = this._prefix_map_prefix[prefix];
			
			if (uri.substr(0, prefix_uri.length) == prefix_uri)
				return prefix + ':' +  uri.substr(prefix_uri.length);
		}
	},
	
	/**
	 * Expand an abbreviated URI by the stored prefixes
	 *
	 * @param uri <String> The URI to expand.
	 * @return <String> The expansion of the URI.
	 */
	expand: function(uri)
	{
		var parts = uri.toString().split(':', 2);
		var prefix = this._prefix_map_prefix[parts[0]];
		
		if (prefix == null)
			return uri;
		
		return prefix + parts[1];
	},
	
	/**
	 * Check the request queue for any waiting requests
	 */
	_checkRequests: function()
	{
		if (this._request_queue.length == 0)
			return;
		
		var uris = this._request_queue;
		this._request_queue = [];
		
		this._requestLabels(uris, this._processLabels.bind(this));
	},
	
	/**
	 * Request an array of labels from the server
	 *
	 * @param uris     <Array<String>> URIs to request labels for
	 * @param callback <Function>      Function to call with the results of the JSON request.
	 */
	_requestLabels: function(uris, callback)
	{
		var data = '';
		for (var i=0; i < uris.length; i++) {
			data += '&uris[]=' + uris[i];
		};
		data = data.substring(1);
		
		var req = new Request.JSON({
			'data': data,
			'url' : 'ajax/label.php',
			'onSuccess': callback
		});
		
		for (var i=0; i < uris.length; i++) {
			this._requests[uris[i]] = req;
		};
		
		req.send();
	},
	
	/**
	 * Process the response from the server.
	 * 
	 * Also invokes any waiting callbacks for this data.
	 */
	_processLabels: function(responseJSON, responseText)
	{
		// will only be an array if it was empty in php
		if($type(responseJSON) == 'array')
			return;
		
		for (var uri in responseJSON) {
			var label = responseJSON[uri];
			
			this._label_map[uri] = label;
			callbacks = this._waiting[uri];
			this._waiting[uri] = null;
			this._requests[uri] = null;
			
			for (var i=0; i < callbacks.length; i++) {
				callbacks[i].apply(null, [uri, label]);
			}
		}
	}
});

