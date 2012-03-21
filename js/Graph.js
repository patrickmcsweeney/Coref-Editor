if (typeof CRS == 'undefined') CRS = {};

CRS.initCanvas = function(canvas_container)
{
	var size = $(canvas_container).getSize();
	return new Canvas('graph', {
		'injectInto': canvas_container,
		'width': size.x,
		'height': size.y,
		'backgroundColor': 'transparent'
	});
};

CRS.Graph = new Class({
	_graphNodeCount: 0,
	
	initialize: function(canvas, controller)
	{
		var self = this;
		var config = {
			'Node': {
				'overridable': true,
				'type'     : 'crs_circle',
				'color'    : '#E5E5E5',
				'dim'      : 15,
				'width'    : 15,
				'height'   : 15,
				'lineWidth': 2,
				'strokeStyle': '#999',
				
				'selectStyles': {
					'current'  : {
						'fillStyle': '#ffdddd'
					}
				}
			},
			'Edge': {
				'overridable': false,
				'type': 'crs_line',
				'color': '#aaa',
				'lineWidth': 4,

				'naturalLength' : 75,
				'restoringForce': 2,

			},

			onCreateLabel: function(label, node) {
				label = $(label);
				label.set('html', '<div>' + node.name + '</div>');
				
				label.addEvent('click'      , self._nodeLabelClicked.bindWithEvent(self, [label, node]));
				label.addEvent('contextmenu', self._nodeLabelContext.bindWithEvent(self, [label, node]));
				label.addEvent('mousedown'  , self._nodeMouseDown.bindWithEvent(self, [label, node]));
			},
			onPlaceLabel: function(label, node){
				label = $(label);
				var isCanon = node.data.uri.bundle.canon == node.data.uri;
				var scale = isCanon ? 1.15 : 0.85;
				
				var size = label.getSize();
				size.x = Math.max(self.controller.Node.dim * 2 * scale, size.x);
				size.y = Math.max(self.controller.Node.dim * 2 * scale, size.y);
				label.setStyle('width' , size.x);
				label.setStyle('height', size.y);

				label.setStyle('left',label.getStyle('left').toInt() - Math.round(size.x /2));
				label.setStyle('top' ,label.getStyle('top' ).toInt() - Math.round(size.y /2));
				
				var inner = label.getElements('div')[0];
				inner.setStyle('margin-top',  -inner.getSize().y /2);
			},
			
			// animation duration
			duration: 1500
		};
		
		// ForceGraph is not a mootools class so it doesn't play well with conventional mootools class extending
		$extend(this, new ForceGraph(canvas, $merge(config, controller)));
	},
	
	'_clickWasNodeMove': false,
	_nodeLabelClicked: function(event, label, node)
	{
		// ignore the event, the action was a node move.
		if (this._clickWasNodeMove){
			this._clickWasNodeMove = false;
			return;
		}
	
		CRS.uriClicked(node.data.uri, event);
	// build the mini-menu
		event.stop();
		if(CRS.actionInProgress=="addEquivalence"){
			CRS.addURIEquivalence(CRS.selected.previous, CRS.selected.current);
		}else if(CRS.actionInProgress=="removeEquivalence"){
			CRS.removeURIEquivalence(CRS.selected.previous, CRS.selected.current);
		}else{
			CRS.buildMiniMenu(event);
		}
	},
	_nodeLabelContext: function(event, label, node)
	{		
		CRS.uriContextClicked(node.data.uri, event);
	},
	
	'_drag': {
		nodes: [],
		pos: null
	},
	_nodeMouseDown: function(event, label, node)
	{
		// tidy up
		if (this._boundNodeMouseUp != null){
			window.removeEvent('mouseup', this._boundNodeMouseUp);
		}
		
		this._drag.pos = event.client;
		var nodes = [];
		var uris = node.data.uri.bundle.uris;
		for (var i=0; i < uris.length; i++)
			nodes.push(this.nodes[uris[i].id]);
			
		this._drag.nodes = nodes;
		
		this._boundNodeMouseUp   = this._nodeMouseUp.bindWithEvent(  this, [label, node]);
		this._boundNodeMouseMove = this._nodeMouseMove.bindWithEvent(this, [label, node]);
		// Bind on the window so we get events out of the window :)
		window.addEvent('mouseup'  , this._boundNodeMouseUp);
		window.addEvent('mousemove', this._boundNodeMouseMove);
	},
	'_boundNodeMouseUp': null,
	_nodeMouseUp: function(event, label, node)
	{
		window.removeEvent('mouseup'  , this._boundNodeMouseUp);
		window.removeEvent('mousemove', this._boundNodeMouseMove);
		this._boundNodeMouseUp = null;
		this._boundNodeMouseMove = null;
	},
	'_boundNodeMouseMove': null,
	_nodeMouseMove: function(event, label, node)
	{
		// flag the impending click event to be ignored
		this._clickWasNodeMove = true;
		
		var nPos = event.client;
		
		var diff = {
			x: this._drag.pos.x - nPos.x,
			y: this._drag.pos.y - nPos.y
		};
		
		// if (Math.abs(diff.x) + Math.abs(diff.y) > 2)
		// {
			for (var i=0; i < this._drag.nodes.length; i++) {
				this._drag.nodes[i].pos.x -= diff.x;
				this._drag.nodes[i].pos.y -= diff.y;
				this._drag.nodes[i].startPos.x -= diff.x;
				this._drag.nodes[i].startPos.y -= diff.y;
			}
			this._drag.pos = nPos;
			
			this.plot();
		// }
	},
	addBundle: function(bundle, color, compute, animate)
	{
		// default to true
		compute = (compute !== false);
		animate = (animate !== false);
		
		var size = this.canvas.getSize();

		var x = 0;
		var y = 0;
		// Pick a random starting position for the nodes
		// NB 0,0 is at the centre
		// Don't do it if this is the first bundle.
		if (this._graphNodeCount != 0) {
			x = Math.round((size.width  * 0.8) * Math.random() - (size.width  * 0.8 * 0.5));
			y = Math.round((size.height * 0.8) * Math.random() - (size.height * 0.8 * 0.5));
		}
		
		var uris = bundle.uris;
		var nodes = [];
		var vars = ['pos', 'startPos', 'endPos'];
		
		var angle = 2 * Math.PI * Math.random();
		var offset = this.controller.Node.width *2;
		for (var i=0; i < uris.length; i++) {
			
			var offX = 0, offY = 0;
			if (bundle.uris[i] != bundle.canon)
			{
				offX = offset * Math.cos(angle);
				offY = offset * Math.sin(angle);
				
				angle += 2 * Math.PI / (uris.length -1);
			}
			
			var node = {
				'id'   : uris[i].id,
				'name' : uris[i].id,
				'data' : {
					'uri'  : uris[i],
					'strokeStyle': 'rgb(' + color.join(',') + ')'
				}
			};

			node = nodes[i] = this.addNode(node);
			for (var j=0; j < vars.length; j++) {
				node[vars[j]].x = x + offX;
				node[vars[j]].y = y + offY;
			}
		}

		var adj = {};
		for (var i=0; i < uris.length; i++) {
			for (var id in uris[i].equivalences) {
				var uri = uris[i];
				var adj = uri.equivalences[id];
				
				var a = uri.id;
				var b = adj.id;

				if (a == b) // should never happen...
					continue;

				// ensure we haven't created this one already
				if (adj[a] == null)
					adj[a] = {};
				if (adj[a][b] != null)
					continue;

				this.addAdjacence(this.getNode(a), this.getNode(b), {});

				if (adj[b] == null)
					adj[b] = {};

				adj[a][b] = true;
				adj[b][a] = true;
			}
		}

		if (compute)
		{
			this.reposition();
			this.computeCenterByMass('endPos', 'endPos');
			this.forceWithinBounds();
			if (animate)
				this.animate();
		}
		
		this._graphNodeCount += uris.length;
	},
	removeBundle: function(bundle, compute, animate)
	{
		// default to true
		compute = (compute !== false);
		animate = (animate !== false);
		
		var uris = bundle.uris;
		var nodes = [];
		
		for (var i=0; i < uris.length; i++)
			this.removeNode(this.getNode(uris[i].id));

		if (compute)
		{
			this.reposition();
			this.computeCenterByMass('endPos', 'endPos');
			this.forceWithinBounds();
			if (animate)
				this.animate();
		}

		this._graphNodeCount += uris.length;
	},
	hasBundle: function(bundle)
	{
		return this.getNode(bundle.canon.id) != null;
	},
	updateColor: function(uris, color)
	{
		for (var i=0; i < uris.length; i++)
			this.getNode(uris[i].id).data.strokeStyle = 'rgb(' + color.join(',') + ')';
		
		this.plot();
	},
	animate: function()
	{
		if (this._graphNodeCount == 0) {
			this.fx.animate({
				transition: Trans.Quart.easeOut
			});
		} else {
			// easeInOut is better if there's already something on the screen
			// so you can get a better idea of where things are going
			this.fx.animate({
				transition: Trans.Quart.easeInOut
			});
		}
	},
	addEquivalence: function(uriA, uriB, compute, animate)
	{
		// default to true
		compute = (compute !== false);
		animate = (animate !== false);
		
		this.addAdjacence(this.getNode(uriA.id), this.getNode(uriB.id), {});
		
		if (compute)
		{
			this.reposition();
			this.computeCenterByMass('endPos', 'endPos');
			this.forceWithinBounds();
			if (animate)
				this.animate();
		}
	},
	removeEquivalence: function(uriA, uriB, compute, animate)
	{
		// default to true
		compute = (compute !== false);
		animate = (animate !== false);
		
		this.removeAdjacence(uriA.id, uriB.id);
		
		if (compute)
		{
			this.reposition();
			this.computeCenterByMass('endPos', 'endPos');
			this.forceWithinBounds();
			if (animate)
				this.animate();
		}
	},
	computeAndAnimate: function()
	{
		this.reposition();
		this.computeCenterByMass('endPos', 'endPos');
		this.forceWithinBounds();
		this.animate();
	}
});

ForceGraph.Plot.EdgeTypes = new Class({
	crs_line: function(adj, canvas) {
		var posStart = adj.nodeFrom.pos.getc(true);
		var posEnd = adj.nodeTo.pos.getc(true);
		
		var node = adj.nodeFrom;
		var uri = node.data.uri;
		var ctx = canvas.getCtx();
		
		if (CRS.selected != null && CRS.selected.bundle === uri.bundle)
		{
			var style = this.edge.selectStyles[modes[i]];
		
			if (style.strokeStyle != null)
				ctx.strokeStyle = style.strokeStyle;
			if (style.lineWidth != null)
				ctx.lineWidth = style.lineWidth;
		}
		else
		{
			if (node.data.strokeStyle != null)
				ctx.strokeStyle = node.data.strokeStyle;
		}
		
		canvas.path('stroke', function(context) {
			context.moveTo(posStart.x, posStart.y);
			context.lineTo(posEnd.x, posEnd.y);
		});
	}
});

ForceGraph.Plot.NodeTypes.implement({
	crs_circle: function(node, canvas)
	{
		var pos = node.pos.getc(true), nconfig = this.node, data = node.data;
		var nodeDim = nconfig.overridable && data && data.$dim || nconfig.dim;
		
		var ctx = canvas.getCtx();
		var uri = data.uri;
		var isCanon = uri.bundle.canon === uri;

		var lineWidth = 0;
		
		if (nconfig.lineWidth != null)
			ctx.lineWidth = lineWidth = nconfig.lineWidth;
			
		if (node.data.strokeStyle != null)
			ctx.strokeStyle = node.data.strokeStyle;
		else if (nconfig.strokeStyle != null)
			ctx.strokeStyle = nconfig.strokeStyle;
				
		if (CRS.selected != null && CRS.selected.current === uri)
		{
			
			var style = nconfig.selectStyles ? nconfig.selectStyles.current : null;
			
			if (style != null)
			{
			
				if (style.fillStyle != null)
					ctx.fillStyle = style.fillStyle;
				if (style.lineWidth != null)
					ctx.lineWidth = lineWidth = style.lineWidth;
				if (style.strokeStyle != null)
					ctx.strokeStyle = style.strokeStyle;
			}
		};
		
		// Scale down the size of the node if this is not the canon
		var scale = isCanon ? 1.15 : 0.85;
		
		canvas.path('fill', function(context) {
			context.arc(pos.x, pos.y, nodeDim * scale, 0, Math.PI*2, true);
		});
				
		if (lineWidth != 0) {
			canvas.path('stroke', function(context){
				context.arc(pos.x, pos.y, (nodeDim * scale) - lineWidth /2, 0, Math.PI*2, true);
			});
		}
	}
});
