if (typeof CRS == 'undefined') CRS = {};

CRS.DataStore = new Class({
	Implements: Events,
	
	'_data' : {},
	// Map of URI to callbacks
	'_waiting' : {},
	// Map of uri to current AJAX requests.
	'_requests': {},
	
	/**
	 * Add a bundle to the data store
	 * Requests the data for each URI in the bundle
	 * 
	 * @param bundle <Bundle> Bundle to add
	 * @return <DataStore> this
	 */
	addBundle: function(bundle)
	{
		for (var i=0; i < bundle.uris.length; i++) {
			this.getData(bundle.uris[i], function(){});
		}
		return this;
	},
	/**
	 * Remove a bundle from the data store
	 * Removes the data for each URI in the bundle
	 * 
	 * @param bundle <Bundle> Bundle to remove
	 * @return <DataStore> this
	 */
	removeBundle: function(bundle)
	{
		for (var i=0; i < bundle.uris.length; i++) {
			this.eraseData(bundle.uris[i]);
		}
		return this;
	},
	
	/**
	 * Get the data for a URI
	 * 
	 * @param uri <URI> URI to request the data for.
	 * @param [callback] <Function> Optional. If present will be invoked with the parameters
	 *                              (<String> uri, <Map<String, Array<String>>> data) once the data is retrieved.
	 * @return If no callback given: <Map<String, Array<String>>> The data for the URI, or null. Otherwise: <DataStore> 'this'.
	 */
	getData: function(uri, callback)
	{
		if (callback == null)
			return this._data[uri];
			
		if (this._data[uri] != null)
		{
			callback.apply(null, [uri, this._data[uri]]);
		}
		else
		{
			if(this._waiting[uri] == null)
				this._waiting[uri] = [];
			
			this._waiting[uri].push(callback);
			
			if (this._requests[uri] == null)
				this._requestData(uri);
		}
		return this;
	},
	/**
	 * Get the data for a collection of URIs
	 * 
	 * @param uri <Array<URI>> URIs to request the data for.
	 * @param [callback] <Function> Optional. If present will be invoked with the parameter
	 *                              (<Map<String, Map<String, Array<String>>>> data) once the data is retrieved.
	 * @return If no callback given: <Map<String, Map<String, Array<String>>>> The data for the URIs. Otherwise: <DataStore> 'this'.
	 */
	getAllData: function (uris, callback)
	{
		if (callback == null)
		{
			var data = {};
			for (var i=0; i < uris.length; i++) {
				data[uris[i]] = this._data[uris[i]];
			}
			return data;
		}
		else
		{
			var wait = function(uri, data) {
				var c = arguments.callee;
			
				if (c.uris[uri] != null)
				{
					c.uris[uri] = null;
					c.data[uri] = data;
					c.uriCount --;
				}
			
				// Delay to prevent recursion depth limit
				if (c.uriCount == 0)
					callback.delay(1, null, [c.data]);
			};
			
			wait.uris = {};
			wait.data = {};
			wait.uriCount = uris.length;
			for (var i=0; i < uris.length; i++)
				wait.uris[uris[i]] = true;
			
			for (var i=0; i < uris.length; i++)
				this.getData(uris[i], wait);
		}
		
		return this;
	},
	/**
	 * Erase the data for a given URI
	 * 
	 * @param uri <URI> URI to erase the data for
	 * @return <DataStore> this
	 */
	eraseData: function (uri)
	{
		this._data.erase(uri.toString());
		return this;
	},
	/**
	 * Build and send a JSON request for data to the server
	 * 
	 * @param uri <URI> URI to request the data for
	 */
	_requestData: function(uri)
	{
		this._requests[uri] = new Request.JSON({
			'data': 'uri=' + uri,
			'url' : 'ajax/describe.php',
			'onSuccess': (function(responseJSON, responseText){
				this._processDataResponse(uri, responseJSON);
			}).bind(this)
		}).send();
	},
	/**
	 * Process the response from a JSON request for data to the server
	 * 
	 * @param uri <URI> URI the request was for
	 * @param data <Map<String, Array<String>> The data response from the server.
	 */
	_processDataResponse: function(uri, data)
	{
		this._data[uri] = new Hash();
		
		// if the data hash is empty, the json will probably give an array instead. check for this
		if ($type(data) != 'array')
		{
			for(var pred in data)
			{
				this._data[uri][pred] = [];
			
				for (var i=0; i < data[pred].length; i++) {
					var len = data[pred][i].length;
					var literal = data[pred][i].substr(1, len -2);

					this._data[uri][pred].push(literal);
				};
			}
		}
		
		this._requests[uri] = null;
		
		var callbacks = this._waiting[uri];
		this._waiting[uri] = null;
		
		if (callbacks == null || callbacks.length == 0)
			return;
		
		for (var i=0; i < callbacks.length; i++) {
			// Delay to prevent recursion depth limit
			callbacks[i].delay(1, null, [uri, this._data[uri]]);
		};
	}
});