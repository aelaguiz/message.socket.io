(function (exports) {
	
exports.talker = Talker = function(client, db, clientObjects) {
	this._client = client;
	this._db = db;
	
	this._comIndex = 1;
	this._established = false;
	
	this._clientObjects = [];
	
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
		expectedIndex = self._comIndex;
		
		self._comIndex+=2;
		 
		self.onMessage(expectedIndex, message, function(err, requestIndex, messageResult) {
			console.dir(requestIndex);
			if(err) {
				console.dir(err);
				reply = self.getError(requestIndex+1, err);
			}
			else {
				reply = self.getReply(requestIndex+1, messageResult);
			}
			
			//console.dir(reply);
			
			self._client.send(JSON.stringify(reply));
		})
	});
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

Talker.prototype.onMessage = function onMessage(expectedIndex, message, callback) {
	var queryPath = '',
		queryParts,
		curQueryPart,
		queryObject,
		queryObjectPath = '',
		request;

	console.log("Received message " + message);

	try {
		request = JSON.parse(message);

		//sys.debug("Request = " + sys.inspect(request));

		queryPath = request.query;
		//sys.debug("QueryPath = " + queryPath);
		
	}
	catch (e) {
		sys.log("Invalid json received " + message + ' error: ' + e);

		return callback(new Error("Invalid json " + message));
	}
	
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
		
		console.log("Transmitting event from " + source + ": " + event.index);
		
		self._client.send(JSON.stringify(event));		
	});
}

})(typeof exports === 'undefined'? this['talker']={}: exports);