if (typeof CRS == 'undefined') CRS = {};

CRS.MultiBundlePane = new Class({
	
	// Enclosing element of this pane.
	'_elem': null,
	'_currentFocus' : null,
	'_previousFocus' : null,

	'_bundlesById': {},
	'_bundleQueue': [],
	'_elementQueue': [],
	
	initialize: function (elem, left, right)
	{
		this._elem       = $(elem);
		this._elem_left  = $(left);
		this._elem_right = $(right);
	},
	addBundle: function(bundle, color)
	{
		if (bundle == null)
			return;
		
		if (this._bundlesById[bundle.id] != null)
			return;
			
		this._bundlesById[bundle.id] = {
			'table_controls': [],
			'header_controls': null
		};

		this._bundleQueue.unshift(bundle);
		
		this._previousFocus = this._currentFocus;
		this._currentFocus = bundle.canon;
		
		this._renderBundle(bundle, color);
		this._updateControls();
	},
	removeBundle: function(bundle)
	{
		if (bundle == null)
			return;
			
		if (this._bundlesById[bundle.id] == null)
			return;
		
		this._bundlesById[bundle.id].wrap.dispose();
		delete this._bundlesById[bundle.id];
		
		for (var i=0; i < this._bundleQueue.length; i++) {
			if (this._bundleQueue[i] === bundle){
				this._bundleQueue.splice(i, 1);
				this._elementQueue.splice(i, 1);
				break;
			}
		}
		
		if (this._currentFocus == bundle){
			this._currentFocus = this._previousFocus;
			this._previousFocus = null;
		} else if (this._previousFocus == bundle) {
			this._previousFocus = null;
		}
		
		this._updateControls();
	},
	setFocus: function(uri)
	{
		if (this._currentFocus === uri)
			return;
			
		var prevFocus = this._currentFocus;
		
		var prevTable = (prevFocus == null || this._bundlesById[prevFocus.bundle.id] == null ?
							null : this._bundlesById[prevFocus.bundle.id].body.getElements('table')[0]);
		var newTable  = (uri == null     || this._bundlesById[uri.bundle.id] == null ?
							null : this._bundlesById[uri.bundle.id    ].body.getElements('table')[0]);
		
		if (this._currentFocus.bundle !== uri.bundle)
			this._previousFocus = this._currentFocus;
			
		this._currentFocus = uri;
		
		this._displayURIFocus(prevFocus, uri, prevTable, newTable);
		this._displayBundleFocus(uri.bundle);
	},
	_renderBundle: function(bundle, color)
	{
		var b = this._bundlesById[bundle.id];
		b.wrap = new Element('div',{
			'class': 'bundleWrapper',
			'styles': {
				'background-color': 'rgb(' + color.join(',') + ')'
			}
		});
		b.header = new Element('div',{
			'class': 'bundleHeader'
		});
		b.body = Element('div',{
			'class': 'bundleBody'
		});

		b.wrap.grab(b.header).grab(b.body);
		this._elementQueue.unshift(b.wrap);
		
		this._renderBundleTitle(b.header, bundle);
		var loading = new Element('div', { 'class': 'loading', 'html': 'Loading Data...'});
		b.body.grab(loading);
		
		CRS.dataStore.getAllData(bundle.uris, (function(data) {
			var table = this._renderBundleTable(bundle, data);
			b.body.removeChild(loading);
			b.body.grab(table);
			
			b.slide = new Fx.Slide(b.body, {
				onComplete: function(){
					if (b.slide.open){
						b.min.set('src', 'img/minus.gif');
					//	b.wrap.removeClass('collapsed');
					} else{
						b.min.set('src', 'img/plus.gif');
					//	b.wrap.addClass('collapsed');
					}
				}
			});
			b.min.addEvent('click', function(event){
				b.slide.toggle();
			});
			
			if (b.wrap.hasClass('collapsed'))
				b.slide.hide();
			
			this._sorter.sort(this._sorter.currentOrder);
		}).bind(this));
		
		b.wrap.inject(this._elem_left);
		
		this._sorter = new CRS.BundlePaneSorter(this._elementQueue, this._elem_left, this._elem_right,
			{
				transition: Fx.Transitions.Quint.easeInOut,
					onComplete: (function(){
						//if(!this._bundlesById[this._currentFocus.bundle.id]){return;}
						var slide = this._bundlesById[this._currentFocus.bundle.id].slide;
						if (slide != null && ! slide.open)
							slide.slideIn();
						
						this._updateControls();
					}).bind(this)
			});
		
		this._sorter.pause();
		this._sorter.sort(this._sorter.currentOrder);
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
	_displayBundleFocus: function (bundle)
	{
		var order = [];
		for (var i=0; i < this._bundleQueue.length; i++) {
			if (this._bundleQueue[i] === bundle) {
				if (this._sorter.currentOrder[i] == 0) {
					order = this._sorter.currentOrder;
					break;
				}
				order[i] = 0;
			} else {
				order[i] = this._sorter.currentOrder[i] + 1;
			}
		}
		// if (typeof console != 'undefined'){
		// 	console.log(order);
		// 	console.log(this._bundleQueue.map(function(bundle){
		// 		return CRS.labeller.label(bundle.canon);
		// 	}).join("\n"));
		// }

		this._sorter.sort(order);
	},
	_renderBundleTitle: function (root, bundle, label, elem)
	{
		var b = this._bundlesById[bundle.id];
		if (elem == null)
		{
			elem = new Element('h2');
			b.title = new Element('a',{
				'href'  : '#',
				'events': {
					'click': function(e){
						CRS.uriClicked(bundle.canon, e);
						e.stop();
					}
				}
			});
			b.min = new Element('img', {
				'src': 'img/minus.gif',
				'height': 16,
				'width' : 16
			});
			
			var controls = new Element('div', {'class': 'controls'});
			b.header_controls = {
				/*'uri': new Element('a', {
					'class': 'controls uri',
					'href' : '#',
					'events': {
						'click': (function(e, uri){
							e.stop();
							CRS.addURIEquivalence(this._currentFocus, uri);
						}).bindWithEvent(this, bundle.canon)
					}
				}),*/
				'canon': new Element('a', {
					'class': 'controls canon',
					'href' : '#',
					'events': {
						'click': (function(e, uri){
							e.stop();
							CRS.addURIEquivalence(this._currentFocus.bundle.canon, uri);
						}).bindWithEvent(this, bundle.canon)
					}
				})
			};
			//controls.grab(b.header_controls.uri).grab(b.header_controls.canon);
			controls.grab(b.header_controls.canon);
			
			elem.grab(b.min).grab(b.title);
			root.grab(elem).grab(controls);
		}
		
		if (label == null)
		{
			b.title.set('html', 'Bundle for <abbr title="' + bundle.canon + '">' + bundle.canon.id + '</abbr>');

			CRS.labeller.label(bundle.canon,
				(function(uri, label) {
					this._renderBundleTitle(root, bundle, label, elem);
				}).bind(this));
		}
		else
		{
			b.title.set('html', '(<abbr title="' + bundle.canon + '">'+ bundle.canon.id + '</abbr>) ' + label);
		}

	},
	_renderBundleTable: function(bundle, data_map)
	{
		var b = this._bundlesById[bundle.id];
		//if(!b){ return;}
		var uris = bundle.uris;
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
		
			var odd = true;

			for (var uri in data_map)
			{	
				uri = CRS.uriManager.getURI(uri);
				var pred_array = data_map[uri].getKeys();

				// reorganise the predicates so a Full Name or Label is first
				for(var i=0; i<pred_array.length; i++){
                                        var label = CRS.labeller.label(pred_array[i]);
                                        if(label == "Full Name"){
						pred_array.unshift(pred_array.splice(i,1)[0]);
						break;	
                                        }
                                        if(label == "Name" || label == "Label" || label == "Family Name"){
						pred_array.unshift(pred_array.splice(i,1)[0]);
                                        }
                                }

				var pred = pred_array[0];
				var row = new Element('tr',{
					'class': 'row_uri' + uri.id + (odd ? ' odd' : '')+' selectable'
				});
				var td_expandable = new Element('td', {'class':'more_data'});
				var plus = new Element('img',{
					'src':'img/plus.gif',
					'id':'toggle_'+uri.id,
					'style':'cursor:pointer;'
				});

				if(pred_array.length > 1){
					plus.inject(td_expandable);
				}
				
				var td_uri = new Element('td', {
					'html' : '<a title="' + uri + '" href="'+uri+'" target="_blank">' + uri.id + '</a>',
					'class': 'uri_id'
				});

				var td_pred = new Element('td', {
					'class': 'predicate'
				});

				if (abbr_map[pred] == null)
					abbr_map[pred] = CRS.labeller.abbreviate(pred);

				var label = CRS.labeller.label(pred);
				var abbr = abbr_map[pred];

				this._renderPredicate(td_pred, pred, abbr, label);

				var literal = data_map[uri][pred][0];
				
				// Consective spaces arent obvious without this
				var text = literal.replace(' ', '&nbsp;');
				
				var matches = literal.match(/^(\s*).+(\s*)$/);
				var pos = [];

				if (matches[1].length > 0) pos.push('Leading');
				if (matches[2].length > 0) pos.push('Trailing');
				
				if (pos.length != 0)
					text = '<abbr title="' + 
						pos.join(' and ') + ' whitespace character' + 
						(matches[1].length + matches[2].length > 1 ? 's' : '') + 
						'.">&quot;' + text + '&quot;</abbr>';
				
				var td_value = new Element('td', {
					'html': text,
					'class': 'value'
				});
				row.grab(td_expandable).grab(td_uri).grab(td_pred).grab(td_value);
				
				var controls = new Element('td', { 'class': 'controls'});

				var currID = this._currentFocus ? this._currentFocus.id : '';
				var prevID = this._previousFocus ? this._previousFocus.id : '';
				var prevDisplay = this._previousFocus ? 'default' : 'none';
				var isolate =  new Element('a',  { 
					'class': 'isolate',
					'href' : '#',
					'html' : '<img src="img/smallcross.png" />',
					'title': 'Isolate URI ' + uri.id,
					'events': {
						'click': (function(e, uri){
							e.stop();
							CRS.isolateURI(uri);
						}).bindWithEvent(this, uri)
					}
				}).inject(controls);
				/*var curr_uri = new Element('a',  { 
					'class': 'current current_uri',
					'href' : '#',
					'events': {
						'click': (function(e, uri){
							e.stop();
							CRS.addURIEquivalence(this._currentFocus, uri);
						}).bindWithEvent(this, uri)
					}
				}).inject(controls);*/
				/*var curr_canon = new Element('a',  { 
					'class': 'current current_canon',
					'href' : '#',
					'events': {
						'click': (function(e, uri){
							e.stop();
							CRS.addURIEquivalence(this._currentFocus.bundle.canon, uri);
						}).bindWithEvent(this, uri)
					}
				}).inject(controls);*/
				/*var prev_uri = new Element('a',  { 
					'class': 'previous previous_uri',
					'href' : '#',
					'events': {
						'click': (function(e, uri){
							e.stop();
							CRS.addURIEquivalence(this._previousFocus, uri);
						}).bindWithEvent(this, uri)
					}
				}).inject(controls);*/
				/*var prev_canon = new Element('a',  { 
					'class': 'previous previous_canon',
					'href' : '#',
					'events': {
						'click': (function(e, uri){
							e.stop();
							CRS.addURIEquivalence(this._previousFocus.bundle.canon, uri);
						}).bindWithEvent(this, uri)
					}
				}).inject(controls);*/
				
				b.table_controls.push({
					//current: {
					//	uri  : curr_uri,
						//canon: curr_canon
					//},
					//previous: {
					//	uri  : prev_uri,
					//	canon: prev_canon
					//},
					isolate: isolate
				});
				
				row.grab(controls);
				tbody.grab(row);

				if(pred_array.length >1){
					var pred_table_row = new Element('tr',{
						'class':'sub_table_row collapsed'+(odd ? ' odd' : ''),
						'id':'more_data_'+uri.id
					}).inject(tbody);

					var pred_table_cell = new Element('td',{ 
						'colspan':5
					}).inject(pred_table_row);
					
					var pred_table = new Element('table', {
						'class': 'predicate_sub_table',
					}).inject(pred_table_cell);
					
					plus.addEvent('click', function(event){
						var button_id = event.target.getProperty('id');
						var row_id = 'more_data_'+ button_id.replace('toggle_','');
						var row_el = $(row_id);
						if(row_el.hasClass('collapsed')){
							row_el.removeClass('collapsed');
							event.target.setProperty('src', 'img/minus.gif');
						}else{
							row_el.addClass('collapsed');
							event.target.setProperty('src', 'img/plus.gif');
						}
					});

					var table_body = new Element('tbody').inject(pred_table);
					for(var i=0; i < pred_array.length; i++){
						var pred = pred_array[i];
						var literal = data_map[uri][pred][0];

						if(literal == null){
							continue;
						}

						var row = new Element('tr',{
							'class':(odd ? 'odd' : '')
						}).inject(table_body);


						var td_uri = new Element('td', {
							'class': 'uri_id'
						}).inject(row);
	
						var td_expandable = new Element('td', {
							'class': 'more_data'
						}).inject(row);

						var plus = new Element('img',{
							'src':'img/plus.gif',
							'id':'sub_toggle_'+uri+"_"+i,
							'style':'cursor:pointer;'
						});

						if(pred_array[i].length > 1){
							plus.inject(td_expandable);
						}


						var pred_cell = new Element('td',{
							'class':'predicate'
						});
						var label = CRS.labeller.label(pred);
						var abbr = CRS.labeller.abbreviate(pred);

						this._renderPredicate(pred_cell, pred, abbr, label);

						// Consective spaces arent obvious without this
						var text = literal.replace(' ', '&nbsp;');

						var td_value = new Element('td', {
							'html': text,
							'class': 'value'
						});
						var controls = new Element('td', { 'class': 'controls'});
						row.grab(pred_cell).grab(td_value).grab(controls);


						if(pred_array[i].length>1){
							var sub_sub_table_row = new Element('tr',{
								'class':'sub_table_row collapsed'+(odd ? ' odd' : ''),
								'id':'even_more_data_'+uri+"_"+i
							}).inject(table_body);
							
							plus.addEvent('click', function(event){
								var button_id = event.target.getProperty('id');
								var row_id = 'even_more_data_'+ button_id.replace('sub_toggle_','');
								var row_el = $(row_id);
								if(row_el.hasClass('collapsed')){
									row_el.removeClass('collapsed');
									event.target.setProperty('src', 'img/minus.gif');
								}else{
									row_el.addClass('collapsed');
									event.target.setProperty('src', 'img/plus.gif');
								}
							});


							var sub_sub_table_cell = new Element('td', {colspan:5} ).inject(sub_sub_table_row);
							var sub_sub_table = new Element("table", {'class':"predicate_sub_table"}).inject(sub_sub_table_cell);
							var sub_sub_table_body = new Element("tbody").inject(sub_sub_table);
							for(var j=1; j < pred_array[i].length; j++){
								var literal = data_map[uri][pred][j];
		
								if(literal == null){
									continue;	
								}						
		
								var row = new Element('tr',{
									'class':(odd ? 'odd' : '')
								}).inject(sub_sub_table_body);
								var td_expandable = new Element('td', {
									'class': 'more_data'
								}).inject(row);
								var td_uri = new Element('td', {
									'class': 'uri_id'
								}).inject(row);
								var pred_cell = new Element('td',{
									'class':'predicate'
								});
								var label = CRS.labeller.label(pred);
								var abbr = CRS.labeller.abbreviate(pred);

								this._renderPredicate(pred_cell, pred, abbr, label);
								
								// Consective spaces arent obvious without this
								var text = literal.replace(' ', '&nbsp;');
								
								var td_value = new Element('td', {
									'html': text,
									'class': 'value'
								});
								var controls = new Element('td', { 'class': 'controls'});
								row.grab(td_uri).grab(pred_cell).grab(td_value).grab(controls);
							}
						}
					}
				}
				odd = !odd;
			}
/*
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
*/
		}

		return table;
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
	_updateControls: function()
	{
		var currID = this._currentFocus.id;
		var prevID = this._previousFocus ? this._previousFocus.id : '';
		
		var labels = {
			current: {
				uri  : '+'  + currID,
				canon: '+C' + currID
			},
			previous: {
				uri  : '+'  + prevID,
				canon: '+C' + prevID
			}
		};
		
		for (var i=0; i < this._bundleQueue.length; i++) {
			var bundle = this._bundleQueue[i];
			var b = this._bundlesById[bundle.id];
				
			var enabled = {
				current : true,
				previous: true,
				isolate: true
			};
			
			enabled.isolate = (bundle.uris.length > 1);
			
			if (bundle === this._currentFocus.bundle)
				enabled.current = false;
			if (this._previousFocus == null ||
			    bundle !== this._currentFocus.bundle)
				enabled.previous = false;
			
			if (bundle === this._currentFocus.bundle)
			{
			//	b.header_controls.uri  .set('html', '+' + prevID);
				if(this._previousFocus){
					//b.header_controls.canon.set('html', 'Add equivalence to ' + this._previousFocus.bundle.canon.id);
					b.header_controls.canon.set('html', '');
				}
			}
			else
			{
			//	b.header_controls.uri  .set('html', '+' + currID);
				b.header_controls.canon.set('html', 'Assert  equivalence to ' + this._currentFocus.bundle.canon.id);
			}
			//b.header_controls.uri  .setStyle('display', this._previousFocus ? null : 'none');
			b.header_controls.canon.setStyle('display', this._previousFocus ? null : 'none');
				
			for (var j=0; j < b.table_controls.length; j++) {
				var c = b.table_controls[j];
				
				//c.current .uri  .setStyle('display', enabled.current  ? null : 'none');
				//c.current .canon.setStyle('display', enabled.current  ? null : 'none');
				//c.previous.uri  .setStyle('display', enabled.previous ? null : 'none');
				//c.previous.canon.setStyle('display', enabled.previous ? null : 'none');
				c.isolate.setStyle('display', enabled.isolate ? null : 'none');
				//c.current .uri  .set('html', labels.current .uri  );
				//c.current .canon.set('html', labels.current .canon);
				//c.previous.uri  .set('html', labels.previous.uri  );
				//c.previous.canon.set('html', labels.previous.canon);
			}
		}
	}
});

CRS.BundlePaneSorter = new Class({
	Extends: Fx.Sort,
	
	elem_left : null,
	elem_right: null,
	
	initialize: function(elements, left, right, options)
	{
		this.parent(elements, options);

		this.elem_left  = left;
		this.elem_right = right;
	},
	
	sort: function(newOrder){
		if ($type(newOrder) != 'array') return false;
		
		newOrder = newOrder.map(function(i){ return i.toInt(); });
		if (newOrder.length != this.elements.length){
			this.currentOrder.each(function(index){
				if (!newOrder.contains(index)) newOrder.push(index);
			});
			if (newOrder.length > this.elements.length)
				newOrder.splice(this.elements.length-1, newOrder.length - this.elements.length);
		}
		
		var current = this.elements.map(function(el, index){
			var size = el.getComputedSize({styles: ['border', 'padding', 'margin']});
			return{
				margin: size['margin-top'],
				margin_left : size['margin-left'],
				margin_right : size['margin-right'],
				height: size.totalHeight
			};
		}, this);
		
		var start  = {};
		var finish = {};
		
		changeMap = newOrder.map(function(newPos, item){
			return [this.currentOrder[item], newPos, item];
		}, this);
		
		// Sort by old position
		changeMap.sort(function(a, b){
			return a[0] - b[0];
		});
		
		var top = 0;
		var topOffset = 0;
		var margin = 0;
		var left_pos = this.elem_left.getPosition();
		var right_pos = this.elem_right.getPosition();
		changeMap.each(function(change){
			var oldPos = change[0];
			var newPos = change[1];
			var item   = change[2];
			
			var el = this.elements[item];
			var begin = {};
			
			begin.top  = el.getStyle('top').toInt() + topOffset;
			begin.left = 0;
			
			if (newPos == 0 && (oldPos > 0 || el.parentNode === this.elem_right)) {
				// If the item is on the right, and wants to end up on the left
				
				// only do this if it is changing column
				if (el.parentNode === this.elem_right) {
					begin.left = right_pos.x - left_pos.x - current[item].margin_right + current[item].margin_left;
					
					// All entries below this one need this much adding to their positions
					topOffset += current[item].height;
					begin.top += top;
				}
			} else if (newPos > 0 && (oldPos == 0 || el.parentNode === this.elem_left)) {
				// If the item is on the left, and wants to end up on the right
				
				// only do this if it is changing column
				if (el.parentNode === this.elem_left)
					begin.left = left_pos.x - right_pos.x + current[item].margin_right;
			}
			
			if (oldPos > 0)
				top += current[item].height;
			
			start[item] = begin;
		}, this);
		
		
		// Sort by new position
		changeMap.sort(function(a, b){
			return a[1] - b[1];
		});
		
		topOffset = 0;
		changeMap.each(function(change) {
			var oldPos = change[0];
			var newPos = change[1];
			var item   = change[2];
			
			var el = this.elements[item];
			var end = {};
			
			start[item].top += topOffset;
			end.top = 0;
			end.left = 0;
			
			if (newPos == 0 && (oldPos > 0 || el.parentNode === this.elem_right)) {
				// If the item is on the right, and wants to end up on the left
				
				// only do this if it is changing column
				if (el.parentNode === this.elem_right)
				{
					el.parentNode.removeChild(el);
					el.inject(this.elem_left, 'top');
				}

			} else if (newPos > 0 && (oldPos == 0 || el.parentNode === this.elem_left)) {
				// If the item is on the left, and wants to end up on the right
				
				// only do this if it is changing column
				if (el.parentNode === this.elem_left)
				{
					el.parentNode.removeChild(el);
					el.inject(this.elem_right, 'top');
					
					topOffset -= current[item].height - current[item].margin;
				}
			}
			
			finish[item] = end;
		}, this);
		
		this.set(start);
		this.start(finish);
		this.currentOrder = newOrder;
		return this;
	}
});
