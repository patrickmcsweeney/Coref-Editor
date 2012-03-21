var CRS_Class = new Class({
	Implements: [Options, Events],

	factory         : null,
	bundleManager   : null,
	labeller        : null,
	bundlePane      : null,
	multiBundlePane : null,
	canvas          : null,
	graph           : null,
	
	_showingInstructions: true,
	
	bundleCount: 0,
	bundleMap: {},
	saveStack:[],
	
	selected : {
		current : null,
		previous: null
	},
	actionInProgress:null,
	
	initialize: function(options)
	{
		this.setOptions(options);
		
		// These objects dont need the DOM
		this.colorManager  = new CRS.ColorManager();
		this.uriManager    = new CRS.URIManager();
		this.bundleManager = new CRS.BundleManager();
		this.dataStore     = new CRS.DataStore();
		this.labeller      = new CRS.Labeller();
		
		this.initLabeller();
		
		// Initialisation later when the DOM is ready.
		window.addEvent('domready', this.onDOMReady);
	},
	initLabeller: function() {
		var prefixes = {
			'http://www.w3.org/2000/01/rdf-schema#'     : 'rdfs',
			'http://www.aktors.org/ontology/support#'   : 'akts',
			'http://www.aktors.org/ontology/portal#'    : 'aktp',
			'http://www.aktors.org/ontology/extension#' : 'akte',
			'http://xmlns.com/foaf/0.1/': 'foaf'
		};
		for (var uri in prefixes)
			this.labeller.setPrefix(prefixes[uri], uri);

		var labels = {
			'rdfs:label'                : 'Label',
			'akts:has-pretty-name'      : 'Pretty name',
			'aktp:full-name'            : 'Full Name',
			'aktp:given-name'           : 'Given Name',
			'aktp:family-name'          : 'Family Name',
			'aktp:has-email-address'    : 'Email Address',
			'aktp:has-web-address'      : 'Web Address',
			'aktp:has-telephone-number' : 'Telephone Number',
			'akte:has-interest'         : 'Interest',
			'foaf:name'         : 'Name'};

		for (var uri in labels)
			this.labeller.setLabelPrefixed(uri, labels[uri]);
	},
	onDOMReady: function()
	{
		var canvas_container = 'graph_pane';

		// These Objects need the DOM to be ready
		CRS.multiBundlePane = new CRS.MultiBundlePane('info_pane','info_pane_left', 'info_pane_right');
		CRS.canvas          = new CRS.initCanvas(canvas_container);
		window.addEvent('resize', function(){
			var size = $(canvas_container).getSize();
			CRS.canvas.resize(size.x, size.y);
			CRS.graph.computeCenterByMass('endPos', 'endPos');
			CRS.graph.animate();
		});
		
		CRS.graph           = new CRS.Graph(CRS.canvas);
		CRS.contextMenu     = new ContextMenu({
			'targets' : null,
			'actions' : {
				connect_curr_selected: function()
				{
					CRS.addURIEquivalence(CRS.selected.current, CRS.contextMenu.uriClicked);
				},
				connect_curr_canon: function()
				{
					CRS.addURIEquivalence(CRS.selected.current.bundle.canon, CRS.contextMenu.uriClicked);
				},
				connect_prev_selected: function()
				{
					CRS.addURIEquivalence(CRS.selected.previous, CRS.contextMenu.uriClicked);
				},
				connect_prev_canon: function()
				{
					CRS.addURIEquivalence(CRS.selected.previous.bundle.canon, CRS.contextMenu.uriClicked);
				},
				disconnect: function(pri, sec)
				{
					CRS.removeURIEquivalence(pri, sec);
				},
				isolate: function()
				{
					CRS.isolateURI(CRS.contextMenu.uriClicked);
				}
			}
		});
		if (CRS.contextMenu.options.trigger != 'click') {
			$(canvas_container).addEvent(CRS.contextMenu.options.trigger, function(e) {
				e.stop();
			});
		}

		CRS.addEvent('onSelectionChanged', CRS.onSelectionChanged.bind(CRS));

		$('uri_button').addEvent('click', (function(e) {
			e.stop();
			CRS.addURI($('input_field').value.trim());
		}));
		$('text_button').addEvent('click', (function(e) {
			e.stop();
			CRS.textSearch($('input_field').value.trim());
		}));
		$('data_input_form').addEvent('submit', function(e){
			if ($('input_field').value.substring(0,4) == 'http')
				$('uri_button').click();
			else
				$('text_button').click();
			e.stop();
		});
		$('input_field').focus();
		document.body.addEvent('click', function(e) {
			var miniMenu = $('mini_menu');
			if(miniMenu){
				if(CRS.actionInProgress){
					CRS.actionInProgress = null;
					var eqButton = $('mmAddEq');
					if(eqButton.hasClass('pressed'))
					{
						eqButton.removeClass('pressed');
					}
					var reEqButton = $('mmRemEq');
					if(reEqButton.hasClass('pressed'))
					{
						reEqButton.removeClass('pressed');
					}

				}
			}
		});	
		// $('demo').addEvent('click', function(e) {
		// 	var fn = function() {
		// 		var uris = arguments.callee.uris;
		// 		
		// 		var uri = uris.shift();
		// 		
		// 		if (uris.length == 0)
		// 			$clear(arguments.callee.interval);
		// 		
		// 		CRS.addURI(uri);
		// 	};
		// 	
		// 	fn.uris = [
		// 	'http://test.rkbexplorer.com/id/7',
		// 	'http://test.rkbexplorer.com/id/9',
		// 	'http://test.rkbexplorer.com/id/12',
		// 	'http://test.rkbexplorer.com/id/70',
		// 	'http://test.rkbexplorer.com/id/52',
		// 	'http://test.rkbexplorer.com/id/60',
		// 	'http://southampton.rkbexplorer.com/id/person-00021'
		// 	];
		// 	fn.interval = fn.periodical(1750);
		// 	fn();
		// });
	},
	addURI: function (string, compute)
	{
		compute = compute !== false;
		var uri = this.uriManager.getURI(string);
		
		if (this._showingInstructions)
			this.hideInstructions();
		
		if (uri.bundle != null)
		{
			if (this.bundleMap[uri.bundle.id] == null)
				this.addBundle(uri.bundle, compute);
			else if (compute)
				this.graph.computeAndAnimate();
			
			this.selectURI(uri);
		}
		else
		{
			this.bundleManager.getBundleForURI(uri, (function(uri, bundle) {
				this.addBundle(bundle, compute);
				this.selectURI(uri);
			}).bind(this));
		}
	},
	textSearch: function(string){
		if (string.length == 0)
			return;
		
		var req = new Request.JSON({
			'data': 'q=' + string,
			'method': 'get',
			'url' : 'ajax/search.php',
			'onSuccess': (function(responseJSON, responseText){
				
				// we got a hash where we wanted an array
				if (responseJSON == null || responseJSON.length == null)
					return;
				
				if (this._showingInstructions)
					this.hideInstructions();
				
				var fn = function (){
					var i = arguments.callee.i;
					
					var entry = responseJSON[i];
					var uri = entry.uri.substring(1, entry.uri.length -1);
					this.labeller.setLabel(uri, entry.label);
					
					this.addURI(uri, i == responseJSON.length -1);
					
					i ++;
					arguments.callee.i = i;
					if (i >= responseJSON.length)
					{
						$clear(arguments.callee.timerID);
					}
				};
				fn.i = 0;
				fn.timerID = fn.periodical(700, this);
				
			}).bind(this)
		}).send();
	},
	hideInstructions: function ()
	{
		$('instructions').dispose();
		$('footer').dispose();
		this._showingInstructions = false;
	},
	addBundle: function(bundle, compute)
	{
		compute = compute !== false;
		
		var info = {
			bundle: bundle
		};
		// TODO implement releasing the color
		var color = this.colorManager.getColor();
		info.color = color;
		
		this.graph.addBundle(bundle, color.rgb, compute);
		this.multiBundlePane.addBundle(bundle, color.rgb);
	
		this.bundleCount++;
		this.bundleMap[bundle.id] = info;
	},
	removeBundle: function(bundle)
	{
		// TODO check no changes involve this bundle
		this._removeBundle(bundle);
	},
	_removeBundle: function(bundle)
	{
		this.colorManager.releaseColor(this.bundleMap[bundle.id].color.id);
		
		this.graph.removeBundle(bundle);
		this.multiBundlePane.removeBundle(bundle);
		
		delete this.bundleMap[bundle.id];
	},
	uriClicked: function(uri, event)
	{
		this.selectURI(uri);
	},
	uriContextClicked: function(uri, event)
	{
		this.contextMenu.uriClicked = uri;

		this.refreshContextMenu(uri);
		this.contextMenu.targetClicked(event, event.target);
		
		event.stop();
	},
	refreshContextMenu: function(uri)
	{
		// remove old elements
		var old = this.contextMenu.menu.getElements('.context_disconnect');
		for (var i=0; i < old.length; i++){
			delete this.contextMenu.options.actions[old[i].getElements('a')[0].href.split('#')[1]];
			old[i].dispose();
		}
		
		var disconns = [];
		
		// Create list elements for the context menu
		(new Hash(uri.equivalences)).each(function(item)
		{
			var elem = new Element('li', {
				'class': 'context_disconnect'
			});
			var link = new Element('a',{
				'href': '#disconnect_' + item.id,
				'html': 'Disconnect from URI ' + item.id
			}).inject(elem);
			
			// register the event for this entry
			this.contextMenu.options.actions['disconnect_' + item.id] = function (){
				CRS.contextMenu.options.actions.disconnect(CRS.contextMenu.uriClicked, item);
			};
			link.addEvent('click', this.contextMenu.menuItemClicked.bindWithEvent(this.contextMenu, link));
			
			disconns.push({
				'id'  : parseInt(item.id),
				'elem': elem
			});
		}, this);
		
		if (disconns.length > 0)
		{
			// Be nice and sort them.
			disconns.sort(function(a, b) {
				return a.id - b.id;
			});
		
			// Add a separator to the one above
			disconns[0].elem.addClass('separator');

			// Inject them above the 'isolate' entry
			var isolate = $('context_isolate');
			for (var i=0; i < disconns.length; i++)
				disconns[i].elem.inject(isolate, 'before');
		}
		
		// Adjust the labels on the 'Add equivalence' elements
		var text = 'URI ' + this.selected.current.id;
		$('context_connect_curr_selected').getElements('span')[0].set('html', text);
		$('context_connect_curr_canon'   ).getElements('span')[0].set('html', text);
		
		text = this.selected.previous == null ? 'N/A' : 'URI ' + this.selected.previous.id;
		$('context_connect_prev_selected').getElements('span')[0].set('html', text);
		$('context_connect_prev_canon'   ).getElements('span')[0].set('html', text);

		
		// // Enable/Disable the constant menu items
		var state = {
			isolate: true, remove: false,
			connect_curr_selected: true, connect_curr_canon: true,
			connect_prev_selected: true, connect_prev_canon: true
		};

		if (this.selected.current.bundle === uri.bundle)
		{
			state.connect_curr_selected = false;
			state.connect_curr_canon = false;
		}
		
		if (this.selected.previous == null ||
			this.selected.previous.bundle === uri.bundle)
		{
			state.connect_prev_selected = false;
			state.connect_prev_canon = false;
		}
		
		if (uri.bundle.uris.length == 1)
			state.isolate = false;
		
		for (var item in state){
			var fn = state[item] ? 'enableItem' : 'disableItem';
			this.contextMenu[fn](item);
		}
	},
	selectURI: function(uri)
	{
		this.selected.previous = this.selected.current;
		this.selected.current = uri;
		this.multiBundlePane.setFocus(uri);
		this.fireEvent('selectionChanged');
	},
	onSelectionChanged: function()
	{
		this.graph.plot();
	},
	isolateURI: function(uri)
	{
		this.removeMiniMenu();
		var bundle = uri.bundle;
		
		for (var id in uri.equivalences){
			this.removeURIEquivalence(uri, uri.equivalences[id]);
			//this.graph.removeEquivalence(uri, uri.equivalences[id], false);
		//	this.removeURIEquivalence(uri, uri.equivalences[id]);
		}
		
		//var newBundles = this.bundleManager.isolateURI(uri);
	
		//if(!this.bundleMap[bundle.id]){return;}	
		//var oldColor = this.bundleMap[bundle.id].color;
		//delete this.bundleMap[bundle.id];
		//this.multiBundlePane.removeBundle(bundle);
		/*
		for (var i = newBundles.length - 1; i >= 0; i--){
			var color;
			if (i == 0)
				color = oldColor;
			else
				color = this.colorManager.getColor();
			
			this.bundleMap[newBundles[i].id] = {
				bundle: newBundles[i],
				color: color
			};
			this.multiBundlePane.addBundle(newBundles[i], color.rgb);
			this.graph.updateColor(newBundles[i].uris, color.rgb);
		}*/
		//for (var id in uri.equivalences){
		//	this.removeURIEquivalence(uri, uri.equivalences[id]);
		//}	
		
		// Delay so we dont hang with the computation
		//this.graph.computeAndAnimate.delay(1, this.graph);
	},
	addURIEquivalence: function (primary, secondary)
	{
		this.removeMiniMenu();
	
		if(primary.bundle===secondary.bundle)
		{
			alert("You cannot assert equivalence between URIs in the same bundle");
			return;
		}		

		var oldBundlePri = primary.bundle;
		var oldBundleSec = secondary.bundle;
	
		
	
		var newBundle = this.bundleManager.addEquivalence(primary, secondary);

		var color = this.bundleMap[oldBundlePri.id].color;
		this.colorManager.releaseColor(this.bundleMap[oldBundleSec.id].color.id);
		
		delete this.bundleMap[oldBundlePri.id];
		delete this.bundleMap[oldBundleSec.id];
		this.bundleMap[newBundle.id] = { bundle: newBundle, color: color};
		
		// Delay so we dont hang the following code with the computation
		(function (){
			this.graph.addEquivalence(primary, secondary);
			this.graph.updateColor(oldBundleSec.uris, color.rgb);
		}).delay(1, this);

		// TODO implement this nicely in the bundlePane
		// Remove the old bundles
		this.multiBundlePane.removeBundle(oldBundlePri);
		this.multiBundlePane.removeBundle(oldBundleSec);
		this.multiBundlePane.addBundle(newBundle, color.rgb);
		//var randomSecondary = this.bundleMap[this.bundleMap[1]];
		this.multiBundlePane.setFocus(secondary);
		this.multiBundlePane.setFocus(primary);

		//alert("pri: " + primary + " sec: " + secondary );
		this.saveStack.push({action:"add", pri:primary, sec:secondary});
		$('save_button').disabled=false;
		//var req = new Request({method: 'get', url: 'ajax/merge.php'});
		//req.send('uri1='+primary + '&uri2='+secondary);

	},
	removeURIEquivalence: function (primary, secondary)
	{
		this.removeMiniMenu();
		var oldBundle = primary.bundle;

		var canRem = false;		
		for (var id in primary.equivalences){
			if(secondary == primary.equivalences[id]){
				canRem=true;
				break;
			}
			//this.graph.removeEquivalence(uri, uri.equivalences[id], false);
		}
		if(!canRem){
			alert("You can only remove equivalence between to equivalent URIs");
			return; 	
		}
	
		var newBundles = this.bundleManager.removeEquivalence(primary, secondary);
		
		var color = this.bundleMap[oldBundle.id].color;
		var newColor = this.colorManager.getColor();
		delete this.bundleMap[oldBundle.id];
		this.multiBundlePane.removeBundle(oldBundle);
		
		this.bundleMap[newBundles[0].id] = { bundle: newBundles[0], color: color};
		this.bundleMap[newBundles[1].id] = { bundle: newBundles[1], color: newColor};
		
		this.multiBundlePane.addBundle(newBundles[1], newColor.rgb);
		this.multiBundlePane.addBundle(newBundles[0], color.rgb);
		
		this.graph.updateColor(newBundles[1].uris, newColor.rgb);
		// Delay so we dont hang the following code with the computation
		this.graph.removeEquivalence.delay(1, this.graph, [primary, secondary]);
		
		//alert("pri: " + primary + " sec: " + secondary );
		this.saveStack.push({action:"remove", pri:primary, sec:secondary});
		$('save_button').disabled=false;
		//var req = new Request({method: 'get', url: 'ajax/unmerge.php'});
		//req.send('uri1='+primary + '&uri2='+secondary);
	},
	save: function()
	{
		for(var i=0; i<this.saveStack.length; i++){
			var actionObj = this.saveStack.shift();
			if(actionObj.action == "add"){
				 var req = new Request({method: 'get', url: 'ajax/merge.php'});
	        	        req.send('uri1='+actionObj.pri + '&uri2='+actionObj.sec);
			}
			if(actionObj.action == "remove"){
				var req = new Request({method: 'get', url: 'ajax/unmerge.php'});
		                req.send('uri1='+actionObj.pri + '&uri2='+actionObj.sec);
			}
		}
		$('save_button').disabled=true;
	},
	buildMiniMenu:function(event)
	{
		this.removeMiniMenu();
	        var menuHeight = 34;
                var menuWidth = 102;
                var menuX = event.page.x - menuWidth/2;
                var menuY = event.page.y - (menuHeight + 15);
                var menu = new Element("div", {id:"mini_menu", style:"height:"+menuHeight+"px; width: "+menuWidth+"px; position:absolute; top:"+menuY+"px; left:"+menuX+"px;"});
                var addEquivalenceButton = new Element("button", {id:"mmAddEq",title:"Assert Equivalence",type:"button", style:"height:"+menuHeight+"px; width:"+menuWidth/3+"px;", 'class':"mmAddButton"});
		addEquivalenceButton.addEvent('click', function(e){
			CRS.toggleActionInProg('addEquivalence'); 
			CRS.toggleButton(e.target);
			e.stop();
		});
                menu.grab(addEquivalenceButton);
                var removeEquivalenceButton = new Element("button", {id:"mmRemEq", title:"Remove Equivalence", type:"button", style:"height:"+menuHeight+"px; width:"+menuWidth/3+"px;", 'class':"mmRemButton"});
		removeEquivalenceButton.addEvent('click', function(e){
			CRS.toggleActionInProg('removeEquivalence'); 
			CRS.toggleButton(e.target);
			e.stop();
		});
                menu.grab(removeEquivalenceButton);
                var isolateButton = new Element("button", {type:"button", title:"Isolate URI", style:"height:"+menuHeight+"px; width:"+menuWidth/3+"px;", 'class':"mmIsolateButton", onclick:"CRS.isolateURI(CRS.selected.current)"});
                menu.grab(isolateButton);
                $$('body')[0].grab(menu);
	},
	removeMiniMenu:function()
	{
		this.actionInProgress = null;
		var mini_menu = $('mini_menu');
                if(mini_menu)
                {
                        mini_menu.parentNode.removeChild(mini_menu);
                }
	},
	toggleActionInProg:function(action)
	{
		if(this.actionInProgress == action){
			this.actionInProgress = null;
		}else{
			this.actionInProgress = action;
		}
	},
	toggleButton:function(button)
	{
		if(button.hasClass('pressed')){
			button.removeClass('pressed');
		}else{
			button.addClass('pressed');
		}
	}

});

if (typeof CRS == 'undefined')
	CRS = {};
	
// global object
CRS = $merge(CRS, new CRS_Class());
