MSIOClient = function MSIOClient(host, port) {
	console.dir(io);
	
	this._queryObjects = [];
	
	this._socket = new io.Socket(host, { 'port': port, 'transports': ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']});
	this._talker = undefined;
}

MSIOClient.prototype.connect = function connect(connectCallback, errorCallback) {
	var self = this;
	
	this._socket.connect();
	
	this._socket.on('connect', function() {
		self._talker = new Talker(self._socket, self._queryObjects);

		self._talker.init();
		
		connectCallback();
	});
}

MSIOClient.prototype.query = function query(queryPath, args, callback) {
	this._talker.sendQuery(queryPath, args, callback);
}
	
/**
 * addQueryObject - Adds an object to the pool of objects which can be referenced by servers
 */
MSIOClient.prototype.addQueryObject = function addQueryObject(objName, obj) {
	this._queryObjects[objName] = obj;
}

/**
 * delQueryObject - Removes an object from the pool of objects which can be referenced by servers
 */
MSIOClient.prototype.delQueryObject = function delQueryObject(objName) {
	delete this._queryObjects[objName];
}

// Export the class so that the closure compiler doesn't rename it
window['MSIOClient'] = MSIOClient;
MSIOClient.prototype['connect'] = MSIOClient.prototype.connect;
MSIOClient.prototype['query'] = MSIOClient.prototype.query;
MSIOClient.prototype['addQueryObject'] = MSIOClient.prototype.addQueryObject;
MSIOClient.prototype['delQueryObject'] = MSIOClient.prototype.delQueryObject;
