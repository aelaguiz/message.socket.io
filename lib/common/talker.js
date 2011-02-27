/**
 * Talker is wrapped in a function so that it can be used easily by the server (node.js) or the client
 */
(function (exports) {
	
exports.Talker = Talker = function(client, clientObjects) {
	this._client = client;
	this._comIndex = 1;
	this._established = false;
	this._sentQueries = [];
	this._clientObjects = clientObjects;
	
	this._defaults = {
		queryTimeoutMs: 2000
	}
	
	if(undefined !== clientObjects) {
		this._clientObjects = clientObjects;
	}
}

Talker.prototype.init = function init() {
	var self = this,
		reply,
		expectedIndex,
		stringReply;
	
	
	this._client.on('message', function(message) {
		console.log("Received raw message = " + message);
		self.onIncoming(message);
	});
}

Talker.prototype.onIncoming = function onIncoming(message) {
	var self = this,
		incoming,
		expectedIndex;
	
	console.dir(this._clientObjects);
	console.log("Received message " + message);

	try {
		incoming = JSON.parse(message);	
	}
	catch (e) {
		sys.log("Invalid json received " + message + ' error: ' + e);

		return ;
	}
	
	/*
	 * This message is a reply to one of our outbound queries
	 */
	if('replyData' === incoming.type) {
		console.log("Received reply");
		console.dir(incoming);
		this.onReply(incoming)
	}
	/*
	 * This message is an event which is not expecting a reply from us
	 */
	else if('event' === incoming.type) {
		this.onEvent(incoming);
	}
	/*
	 * This message is a new query to us
	 */
	else {
		expectedIndex = this._comIndex;
		
		this._comIndex+=2;
		 
		this.onQuery(expectedIndex, incoming, function(err, requestIndex, messageResult) {
			console.dir(requestIndex);
			if(err) {
				console.dir(err);
				reply = self.getError(requestIndex+1, err);
			}
			else {
				reply = self.getReply(requestIndex+1, messageResult);
			}
			
			var jsonReply  = JSON.stringify(reply);
			console.log("Sending: " + jsonReply)
			
			self._client.send(jsonReply);
		});
	}
}

Talker.prototype.onReply = function onReply(reply) {
	var query = this._sentQueries[reply.index],
		callback;
	
	console.dir(query);
	
	if(undefined === query) {
		console.log("Received unknown reply");
		console.dir(reply);
	}
	else {
		console.log("Received reply " + reply.index + " to " + query.sent);
		clearTimeout(query.timeout);
		
		callback = query.callback;
		
		delete this._sentQueries[reply.index];
		
		callback(null, reply);
	}
}

Talker.prototype.getError = function getError(replyIndex, payload) {
	var error = {
		'type': 'replyError',
		'index': replyIndex,
		'error': payload
	};
	
	return error;
}

Talker.prototype.getReply = function getReply(replyIndex, payload) {
	console.dir(replyIndex);
	var reply = {
		'type': 'replyData',
		'index': replyIndex,
		'result' : payload
	};
	
	return reply;
}

Talker.prototype.sendQuery = function sendQuery(queryPath, args, callback) {
	var self = this,
		query = {
			'query': queryPath,
			'index': this._comIndex++,
			'args': args 
		},
		message = JSON.stringify(query),
		expectingIndex = query.index+1;
	
	this._sentQueries[expectingIndex] = {
		'sent': message,
		'expectingIndex': expectingIndex,
		'callback': callback,
		'timeout': setTimeout(function() {self.queryTimeout(expectingIndex)}, this._defaults.queryTimeoutMs)
	};
	
	this._client.send(message);
}

Talker.prototype.queryTimeout = function queryTimeout(index) {
	var callback = this._sentQueries[index].callback;
	
	delete this._sentQueries[index];
	
	callback(new Error("Query timed out"));
}

/**
 * onMessage - Handles new incoming requests
 */
Talker.prototype.onQuery = function onQuery(expectedIndex, request, callback) {
	var queryPath = request.query,
		queryParts,
		curQueryPart,
		queryObject,
		queryObjectPath = '',
		request;		
	
	if(expectedIndex != request.index) {
		console.log("Synch error got " + request.index + " expecting " + expectedIndex);
		return callback(new Error("Synchronization error"));
	}
	
	/*
	 * Resolve a dot seperated object chain
	 */
	queryParts = queryPath.split('.');
	
	if(queryParts.length < 2) {
		return callback(new Error("Invalid query specified"));
	}

	this.clientQuery(queryParts, request.args, request.index, callback);
}

Talker.prototype.clientQuery = function clientQuery(queryParts, args, requestIndex, callback) {
	var self = this,
		queryObject = this.resolveObject(queryParts, queryParts.length-1),
		path = queryParts[queryParts.length-1],
		targetSpec,
		targetFunctionName,
		targetFunction;
		
	
	if(undefined === queryObject) {
		callback(new Error("Invalid query object " + queryObject), requestIndex);
	}
	else {
		targetSpec = queryObject.expose[path];
	
		if (undefined === targetSpec) {
			callback(new Error("Invalid query path " + path), requestIndex);
		}
		else {
			targetFunctionName = targetSpec['function'];
			if (undefined === targetFunctionName) {
				callback(new Error("Target is not a function " + path), requestIndex);
			}
			else {
				targetFunction = queryObject[targetFunctionName];

				if(undefined === targetFunction) {
					callback(new Error("Path api not implemented " + path), requestIndex);
				}
				else {
					queryObject[targetFunctionName].call(queryObject, this, args, function(err, result) {
						if(err)
							callback(err, requestIndex);
						else {
							callback(null, requestIndex, result);
						}
					});
				}
			}
		}
	}
}
/**
 * Resolve a dot seperated object chain
 * @param {Object} path
 */
Talker.prototype.resolveArgument = function(queryPath) {
	if(undefined === queryPath)
		return undefined;
		
	var queryParts = queryPath.split('.');
	
	if(queryParts.length < 2) {
		console.log("Query path is too short");
		return undefined;
	}
	
	return this.resolveObject(queryParts, queryParts.length);
}

/**
 * Constructs all objects in a query object chain
 * @param {Object} queryParts
 * @param {Object} numParts
 */
Talker.prototype.resolveObject = function(queryParts, numParts) {
	var queryObject = this.getQueryObject(queryParts[0]),
		curObjectName,
		clientObjects = this._clientObjects,
		childObject;
		
	console.dir(queryObject);
	console.dir(queryParts);
	console.dir(this._clientObjects);
	if(undefined === queryObject) {
		console.log("Chain should start with valid object");
		return undefined;
	}
	
	for(var i = 1, max = numParts; i < max; i++) {
		curObjectName = queryParts[i];
		
		if(undefined === queryObject.expose) {
			console.log("queryObject does not expose any children");
			return undefined;
		}
		else if(undefined === queryObject.expose[curObjectName]) {
			console.log("queryObject does not expose any children");
			return undefined;
		}
		else {
			childObject = queryObject.expose[curObjectName].object;
			
			if(undefined === childObject) {
				console.log("Object does not expose " + curObjectName);
				console.dir(queryObject);
				console.dir(queryObject.expose[curObjectName]);
				return undefined;
			}
			
			queryObject = childObject;
		}
	}
	
	return queryObject;
}

/**
 * getQueryObject - Constructs the initial object in a query
 * @param {Object} object
 */
Talker.prototype.getQueryObject = function(object) {
	var objectInstance = undefined;
	
	try {
		if(undefined == this._clientObjects[object]) {
			var req = require(object);
	
			/*
			 * Capitalize the name that was sent
			 */		
			var constructorName = object;
			constructorName = constructorName[0].toUpperCase() + constructorName.substring(1, constructorName.length);
	
			objectInstance = new req[constructorName](this._db);
			
			console.log("Talker: Instantiated new " + constructorName);
			this._clientObjects[object] = objectInstance;
		}

		return this._clientObjects[object];
	}
	catch(e) {
		console.log("Failed to create client object of type " + object);
		return undefined;
	}
}

/**
 * Subscribes to specified event for object which will be retransmitted to clients
 * @param {Object} object
 * @param {Object} event
 */
Talker.prototype.subscribeObject = function subscribeObject(object, event) {
	var self = this,
		event;
	
	object.on(event, function(source, message) {
		event = {
			'type': 'event',
			'source': source,
			'data': message,
			'index': self._comIndex++
		};
		
		var jsonEvent = JSON.stringify(event);
		console.log("Transmitting event from " + source + ": " + event.index + " " + jsonEvent);

		self._client.send(jsonEvent);		
	});
}

})(typeof exports === 'undefined'? this['talker']={}: exports);