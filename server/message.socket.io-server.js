require.paths.push(__dirname + '/../lib');

var io = require('socket.io-node'),
	Talker = require('common').Talker,
	EventEmitter = require('events').EventEmitter;
 
exports.Server = Server = function Server(httpServer) {
	this._socket = io.listen(httpServer);
	this._talkers = [];
	this._queryObjects = [];
	
	this.init();
}


Server.prototype.__proto__ = EventEmitter.prototype;

Server.prototype.init = function init() {
	var self = this;
	
	this._socket.on('connection', function(client) { 
		var talker = new Talker(client, self._queryObjects);
		
		talker.init();
		
		self._talkers.push(talker);
		
		client.on('disconnect', function() {
			self.emit('disconnect', talker);
		});
	});
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