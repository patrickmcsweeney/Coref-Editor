if (typeof CRS == 'undefined') CRS = {};

CRS.ColorManager = new Class({
	'colors'    : {},
	'colorQueue': [],
	'num'       : 1,
	
	initialize: function()
	{
		this._makeColors(10);
	},
	getColor: function()
	{
		if (this.colorQueue.length == 0)
			this._makeColors(this.num * 2);
			
		return this.colorQueue.shift();
	},
	releaseColor: function(id)
	{
		this.colorQueue.push({id: id, rgb:this.colors[id]});
	},
	_makeColors: function(num)
	{
		for (var i=0; i < num; i++) {
			var j = i * 360/ num;
			
			if (this.colors[j] != null)
				continue;

			var rgb = [j, 65, 90].hsbToRgb();

			this.colorQueue.push({id: j, rgb: rgb});
			this.colors[j] = rgb;
		}
		
		this.num = num;
	}
});