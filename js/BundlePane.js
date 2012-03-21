if (typeof CRS == 'undefined') CRS = {};

CRS.BundlePane = new Class({

	// Enclosing element of this pane.
	'_elem': null,
	'_currentBundle' : null,
	'_currentURI': null,
	
	initialize: function (elem)
	{
		this._elem = $(elem);
	},
	setBundleFocus: function (bundle)
	{
		if (this._currentBundle === bundle)
			return this;
		
		if (this._currentBundle == null)
		{
			var bundleHeader = this._elem.getElements('div.bundleHeader')[0];
			bundleHeader.removeClass('placeholder');
		}
		
		this._currentBundle = bundle;
		this._currentURI = null;
		
		this._displayBundle(bundle);
		
		return this;
	},
	setURIFocus: function (uri)
	{
		if (this._currentURI === uri)
			return this;
		
		var prevURI = this._currentURI;
		this._currentURI = uri;
		
		var table = this._elem.getElements('div.bundleBody table')[0];
		this._displayURIFocus(prevURI, uri, table, table);
	},
	_displayURIFocus: function (prevURI, newURI, prevTable, newTable)
	{
		var rows;
		if (prevURI != null && prevTable != null)
		{
			rows = prevTable.getElements('tr');
		
			for (var i=0; i < rows.length; i++) {
				rows[i].removeClass('focus');
			}
		}
		
		if (newURI != null && newTable != null)
		{
			rows = newTable.getElements('tr');
		
			for (var i=0; i < rows.length; i++) {
				if (rows[i].hasClass('row_uri' + newURI.id))
					rows[i].addClass('focus');
			}
		}
	},
	_displayBundle: function (bundle)
	{
		this._displayLoading(bundle);
		
		this._renderBundle(bundle);
	},
	_displayLoading: function(bundle)
	{
		// TODO set a loading spinner on the pane body
		var bundleBody = this._elem.getElements('div.bundleBody')[0];
	},
	_renderBundle: function(bundle)
	{
		var bundleHeader = this._elem.getElements('div.bundleHeader')[0];
		var title = this._renderBundleTitle(bundle);
		bundleHeader.empty().grab(title);
		
		var bundleBody = this._elem.getElements('div.bundleBody')[0];
		CRS.dataStore.getAllData(bundle.uris, (function(data) {
			var table = this._renderBundleTable(bundle.uris, data);
			bundleBody.empty().grab(table);
		}).bind(this));
	},
	_renderBundleTitle: function (bundle, label, elem)
	{
		var h3 = (elem == null ? new Element('h3') : elem);
		
		if (label == null)
		{
			h3.set('html', 'Bundle for <abbr title="' + bundle.canon + '">' + bundle.canon.id + '</abbr>');
			
			CRS.labeller.label(bundle.canon,
				(function(uri, label) {
					this._renderBundleTitle(bundle, label, h3);
				}).bind(this));
				
			return h3;
		}
		
		h3.set('html', label);
		return h3;
	},
	_renderBundleTable: function(uris, data_map)
	{
		// Build the table
		// need to set HTML on table because you cant do it to thead or tbody 
		var table = new Element('table', {
			'class': 'bundleTable'
		});
		// table.set('html', '<thead><tr><th>URI</th><th>Property</th><th>Value</th></tr></thead>');
		var tbody = new Element('tbody').inject(table);
		
		// Abbreviations cache. Saves on computation.
		var abbr_map = {};
		
		// if the json gave us an array where we were expecting a hash, thatd be because it is empty
		// length is only on arrays
		if (data_map.length == null) {
			
			var predicates = [];
			for (var uri in data_map)
			{
				predicates.combine(data_map[uri].getKeys());
			}
			predicates.sort();
		
			var odd = true;
			/*	
			for (var uri in data_map)
			{
				var row = new Element('tr',{
					'class': 'row_uri' + uri.id + (odd ? ' odd' : '')
				});
				var td_uri = new Element('td', {
					'html' : '<abbr title="' + uri + '">' + uri.id + '</abbr>',
					'class': 'uri_id'
				});
			
				var td_pred = new Element('td', {
					'class': 'predicate'
				});

				var pred = predicates[0];
				var j = 0;
		
				if (abbr_map[pred] == null){
					abbr_map[pred] = CRS.labeller.abbreviate(pred);
				}

				var label = CRS.labeller.label(pred);
				var abbr = abbr_map[pred];

				this._renderPredicate(td_pred, pred, abbr, label);
			
				var td_value = new Element('td', {
					'html': data_map[uri][pred][j],
					'class': 'value'
				});
				row.grab(td_uri).grab(td_pred).grab(td_value);
			
				tbody.grab(row);
				
				odd = !odd;
				for (var i=0; i < predicates.length; i++) {
					var pred = predicates[i];
					uri = CRS.uriManager.getURI(uri);

					for (var j=0; data_map[uri][pred] != null && j < data_map[uri][pred].length; j++) {
						
					}
				}
			}
			*/
			if (predicates.length == 0)
			{
				var row = new Element('tr',{
					'class': 'placeholder'
				});
				var td = new Element('td',{
					'class': 'placeholder',
					'colspan': 3,
					'html' : 'No data for this bundle'
				}).inject(row);
				tbody.grab(row);
			}
		}
		
		return table;
	},
	_addControls: function (bundle, wrap) {
		var table = wrap.getElements('.bundleBody table')[0];
		
		var rows = table.getElements('tr');
		for (var i=0; i < rows.length; i++) {
			var controls = new Element('td', {
				'class': 'controls'
			});
			var add = new Element('img', {
				'src' : 'img/silk/icons/chart_organisation_add.png'
			}).inject(controls);
			var del = new Element('img', {
				'src' : 'img/silk/icons/chart_organisation_delete.png'
			}).inject(controls);
			
			rows[i].grab(controls);
		}
	},
	_renderPredicate: function(elem, pred, abbr, label)
	{
		var html;
		if (label == null)
		{
			labels_needed[pred] = [td_pred];
			html = '<span class="label">' + abbr + '</span>';
			
			CRS.labeller.getLabel(pred, (function(uri, label){
				this._renderPredicate(elem, pred, abbr, label);
			}).bind(this));
			
		} else {
			html = '<span class="label">' + label + 
			       '</span> <span class="abbr">(' + abbr + ')</span>';
		}
		elem.set('html', html);
	},
	
});
