require.paths.push(__dirname + '/../lib');

var io = require('socket.io-node'),
	Talker = require('common').Talker,
	EventEmitter = require('events').EventEmitter;
 
exports.Server = Server = function Server(httpServer, debug) {
	this._socket = io.listen(httpServer);
	this._talkers = [];
	this._queryObjects = [];
	
	this.debug = debug || false;

	this.init();
}


Server.prototype.__proto__ = EventEmitter.prototype;

Server.prototype.init = function init() {
	this._socket.on('connection', _.bind(function(client) { 
		var talker = new Talker(client, this._queryObjects, this.debug);
		
		talker.init();
		
		this._talkers.push(talker);
		
		client.on('disconnect', function() {
			this.emit('disconnect', talker);
		});
	}, this));
}

/**
 * addQueryObject - Adds an object to the pool of objects which can be referenced by connections
 */
Server.prototype.addQueryObject = function addQueryObject(objName, obj) {
	this._queryObjects[objName] = obj;
}

/**
 * delQueryObject - Removes an object from the pool of objects which can be referenced by connections
 */
Server.prototype.delQueryObject = function delQueryObject(objName) {
	delete this._queryObjects[objName];
}
