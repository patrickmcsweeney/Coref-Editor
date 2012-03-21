if (typeof CRS == 'undefined') CRS = {};

CRS.BundleManager = new Class({
	// map of bundle ID to bundle
	'_bundles_by_id' : {},
	// Array of new bundles
	'_new_bundles'   : [],
	
	// Map of URI to callbacks
	'_waiting' : {},
	// Map of uri to current AJAX requests.
	'_requests': {},

	/**
	 * Get the bundle for a given URI
	 *
	 * @param uri        <String>   The URI to get the bundle for
	 * @param [callback] <Function> Optional. If present will be invoked with the parameters
	 *                              (<URI> uri, <Bundle> bundle) once the bundle is identified.
	 * @return If no callback given: <Bundle> The Bundle of the URI, or null. Otherwise <BundleManager> 'this'.
	 */
	getBundleForURI: function (uri, callback)
	{
		if (callback == null)
			return uri.bundle;

		if (uri.bundle != null){
			callback.delay(1, null, [uri, uri.bundle]);
			return this;
		}
		
		if(this._waiting[uri] == null)
			this._waiting[uri] = [];
		
		this._waiting[uri].push(callback);
		
		if (this._requests[uri] == null)
			this._requestEquivalenceGraph(uri);
		
		return this;
	},
	/**
	 * Add an equivalence between two URIs
	 *
	 * @param primaryURI   <URI> The primary URI
	 * @param secondaryURI <URI> The secondary URI
	 * @return <Bundle> the bundle resulting from the merge.
	 */
	addEquivalence: function(primaryURI, secondaryURI)
	{
		// TODO transactions: Add logging hook in here.
		
		var uris = [];
		
		for (var i=0; i < primaryURI.bundle.uris.length; i++)
			uris.push(primaryURI.bundle.uris[i]);
		for (var i=0; i < secondaryURI.bundle.uris.length; i++)
			uris.push(secondaryURI.bundle.uris[i]);
		
		primaryURI.bundle.active = false;
		secondaryURI.bundle.active = false;
		
		var newBundle = this._createBundle(-1, primaryURI.bundle.canon, uris);
		primaryURI.equivalences[secondaryURI.id] = secondaryURI;
		secondaryURI.equivalences[primaryURI.id] = primaryURI;
		
		return newBundle;
	},
	/**
	 * Remove an equivalence between two URIs
	 *
	 * @param primaryURI   <URI> The primary URI
	 * @param secondaryURI <URI> The secondary URI
	 * @return <Array<Bundle>> The two bundles resulting from the split. respective to the two URIs
	 */
	removeEquivalence: function(primaryURI, secondaryURI)
	{
		// TODO transactions: Add logging hook in here.
		
		var position = this._check_equivalences_for_canon(primaryURI, secondaryURI, primaryURI.bundle.canon);
	
		delete primaryURI.equivalences[secondaryURI.id];
		delete secondaryURI.equivalences[primaryURI.id];
		
		var urisA = this._flatten_equivalences(primaryURI);
		var urisB = this._flatten_equivalences(secondaryURI);
		
		var canonA = position ? primaryURI.bundle.canon : primaryURI;
		var canonB = position ? secondaryURI : secondaryURI.bundle.canon;
		
		primaryURI.bundle.active = false;
		secondaryURI.bundle.active = false;
		
		return [this._createBundle(-1, canonA, urisA), this._createBundle(-1, canonB, urisB)];
	},
	/**
	 * Remove all equivalences with a URI
	 *
	 * @param uri <URI> The uri
	 * @return <Array<Bundle>> The bundles resulting from the split. The first bundle will be the one containing the isolated URI.
	 */
	isolateURI: function(uri)
	{
		// TODO transactions: Add logging hook in here.
		var bundles = [];
		
		// Dont look for the canon if this is it.
		var foundCanon = (uri === uri.bundle.canon);
		uri.bundle.active = false;
		
		// Create new bundles for each disconnected equivalence
		// Try to maintain the canon on the side which it remains on
		for (var id in uri.equivalences)
		{
			var other = uri.equivalences[id];
			
			var hasCanon = false;
			
			if (! foundCanon)
				hasCanon = this._check_equivalences_for_canon(other, uri, uri.bundle.canon);
				
			var newCanon = other;
			if (hasCanon)
			{
				foundCanon = true;
				newCanon = uri.bundle.canon;
			}
			
			delete uri.equivalences[other.id];
			delete other.equivalences[uri.id];

			var uris = this._flatten_equivalences(other);
			bundles.push(this._createBundle(-1, newCanon, uris));
		}
		
		bundles.unshift(this._createBundle(-1, uri, [uri]));
		
		return bundles;
	},
	/**
	 * Create a new bundle
	 */
	_createBundle: function(id, canon, uris)
	{
		if (id != -1) {
			// bundle exists in the CRS
			id = 'e' + id;
		} else {
			// bundle does not
			id = 'n' + this._new_bundles.length;
		}
		
		var bundle = new CRS.Bundle(id, canon, uris);
		
		for (var i=0; i < uris.length; i++) {
			uris[i].bundle = bundle;
		};
		
		this._bundles_by_id[id] = bundle;
		if (id[0] == 'n')
			this._new_bundles.push(bundle);
		
		return bundle;
	},
	/**
	 * Traverse the equivalence graph for a URI and return all the URIs in it
	 * @return <Array<URI>> URIs in the equivalence graph.
	 */
	_flatten_equivalences: function(uri)
	{
		var visited = {};
		var list = [];
		var queue = [uri];

		while (queue.length > 0)
		{
			var item = queue.shift();

			visited[item.id] = true;
			list.push(item);

			for (var id in item.equivalences)
			{
				if (visited[id] == null)
					queue.push(item.equivalences[id]);
			}
		}
		
		return list;
	},
	/**
	 * Check which side of an equivalence graph contains the canon
	 * @return <Boolean> true if the primaryURI graph has the canon, false if secondaryURI has the canon.
	 */
	_check_equivalences_for_canon: function(primaryURI, secondaryURI, canon)
	{
		if (secondaryURI === canon)
			return false;
		
		var visited = {};
		var queue = [primaryURI];
		
		while (queue.length > 0)
		{
			var item = queue.shift();
			
			if (item === canon)
				return true;
			
			visited[item.id] = true;
			
			for (var id in item.equivalences)
			{
				if (id == secondaryURI.id)
					continue;
					
				if (visited[id] == null)
					queue.push(item.equivalences[id]);
			}
		}
		
		return false;
	},
	_requestEquivalenceGraph: function(uri) {
		this._requests[uri] = new Request.JSON({
			'data': 'uri=' + uri,
			'url' : 'ajax/graph.php',
			'onSuccess':
				(function(responseJSON, responseText) {
					this._processEquivalenceGraphResponse(uri, responseJSON, responseText);
				}).bind(this)
		}).send();
	},
	_processEquivalenceGraphResponse: function(uri, responseJSON, responseText)
	{
		var bundle_id = responseJSON[0];
		var canon_idx = responseJSON[1];
		var uris      = responseJSON[2];
		var equivs    = responseJSON[3];
	
		// If this URI has no bundle in the CRS
		if (bundle_id == -1)
		{
			canon_idx = 0;
			uris      = [uri];
			equivs    = [];
		}
		
		for (var i=0; i < uris.length; i++) {
			uris[i] = CRS.uriManager.getURI(uris[i]);
		}
		
		var bundle = this._createBundle(bundle_id, uris[canon_idx], uris);
		
		for (var i=0; i < equivs.length; i++) {
			for (var j=0; j < equivs[i].length; j++) {
				var from = uris[i];
				var to = uris[equivs[i][j]];
				// no need to ensure the relation is reciprocal
				// the json should ensure that
				from.equivalences[to.id] = to;
			};
		};
		
		for (var i=0; i < uris.length; i++) {
			delete this._requests[uris[i]];
		
			var callbacks = this._waiting[uris[i]];
			delete this._waiting[uris[i]];
		
			if (callbacks == null || callbacks.length == 0)
				continue;
		
			for (var i=0; i < callbacks.length; i++) {
				// Delay to prevent recursion depth limit
				callbacks[i].delay(1, null, [uris[i], uris[i].bundle]);
			};
		}
	}
});
