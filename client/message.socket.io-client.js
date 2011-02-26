MSIOClient = function MSIOClient(host, port) {
	console.dir(io);
	
	this._socket = new io.Socket(host, { 'port': port, 'transports': ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']});
}

MSIOClient.prototype.connect = function init(connectCallback, errorCallback) {
	var self = this;
	
	this._socket.connect();
	
	this._socket.on('connect', function() { 
		connectCallback();
	});
}

// Export the class so that the closure compiler doesn't rename it'
window['MSIOClient'] = MSIOClient;
MSIOClient.prototype['connect'] = MSIOClient.prototype.connect;
