/**
 * Talker is wrapped in a function so that it can be used easily by the server (node.js) or the client
 */
(function (exports) {

var __talkerInstance = 1;

/*
 * Stolen from: http://stackoverflow.com/questions/1583123/circular-buffer-in-javascript
 */
var CircularBuffer = function CircularBuffer(n) {
	this._array= new Array(n);
	this.length= 0;
};

CircularBuffer.prototype.toString= function() {
    return '[object CircularBuffer('+this._array.length+') length '+this.length+']';
};

CircularBuffer.prototype.get= function(i) {
    if (i<0 || i<this.length-this._array.length) {
		    return undefined;
		  }
	return this._array[i%this._array.length];
};

CircularBuffer.prototype.set= function(i, v) {
	if (i<0 || i<this.length-this._array.length)
		throw CircularBuffer.IndexError;

	while (i>this.length) {
		this._array[this.length%this._array.length]= undefined;
		this.length++;
	}

	this._array[i%this._array.length]= v;

	if (i==this.length)
		this.length++;
};

CircularBuffer.IndexError= {};

exports.Talker = Talker = function(client, clientObjects, debug) {
	this._client = client;
	this._comIndex = 1;
	this._established = false;
	this._sentQueries = [];
	this._clientObjects = clientObjects;
	this._instanceId = __talkerInstance++;
	
	this._defaults = {
		onQueryTimeoutMs: 2000
	}

	this.debug = debug || false;
	console.log("Talker: " + this.debug);

	if(this.debug) {
		this.totalIn = 0;
		this.totalOut = 0;
		this.startTime = new Date();
		this.outBuf = new CircularBuffer(60);
		this.inBuf = new CircularBuffer(60);

		this.lastOut = -1;
		this.lastIn = -1;

		for(var i = 0; i < 60; i++) {
			this.inBuf.set(i, 0);
			this.outBuf.set(i, 0);
		}

		setInterval(_.bind(this.displayStats, this), 10000);
	}
	
	if(undefined !== clientObjects) {
		this._clientObjects = clientObjects;
	}
};

/*
 * Initializes this object
 */
Talker.prototype.init = function init() {
	var self = this,
		reply,
		expectedIndex,
		stringReply;
	
	this._client.on('message', function(message) {
		self.logTraffic(false, message.length);
		self.onIncoming(message);
	});
};

Talker.prototype.getInstanceId = function getInstanceId() {
	return this._instanceId;
};

Talker.prototype.logTraffic = function(outbound, bytes) {
	if(this.debug) {
		var index = new Date().getSeconds();

		var buf = this.inBuf;
		if(outbound) { 
			buf = this.outBuf;
			this.totalOut += (bytes);
		}
		else {
			this.totalIn += (bytes);
		}


		if(this.lastOut !== index) {
			buf.set(index, 0);
			this.lastOut = index;
		}

		buf.set(index, buf.get(index)+bytes);
	}
};

Talker.prototype.displayStats = function() {
	if(!this.debug) {
		return ;
	}

	var outTotal = 0,
	    inTotal = 0,
	    elapsed = (new Date()-this.startTime)/1000,
	    divisor = elapsed;

	if(divisor > 60) {
		divisor = 60;
	}

	for(var i = 0; i < 60; i++) {
		inTotal += this.inBuf.get(i);
		outTotal += this.outBuf.get(i);
	}

	console.log("SOCKET.IO: " + (outTotal/1000/divisor).toFixed(2) + " out kb/s (" + (this.totalOut/1000/elapsed).toFixed(2) + " overall) " + (inTotal/1000/divisor).toFixed(2) + " in kb/s (" + (this.totalIn/1000/elapsed).toFixed(2) + " overall)");
};

/**
 * onIncoming - handles an incoming raw message
 */
Talker.prototype.onIncoming = function onIncoming(message) {
	var self = this,
		incoming,
		expectedIndex,
		reply;
	
	try {
		incoming = JSON.parse(message);	
	}
	catch (e) {
		console.log("Invalid json received " + message + ' error: ' + e);

		return ;
	}
	
	try {
		/*
		 * This message is a reply to one of our outbound queries
		 */
		if('replyData' === incoming.type) {
			this.onReply(incoming)
		}
		/*
		 * This message is a reply to one of our outbound queries - but it has failed
		 */
		else if('replyError' == incoming.type) {
			this.onReplyError(incoming);
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
				if(err) {
					reply = self.getErrorQuery(requestIndex+1, err.message);
				}
				else {
					reply = self.getReplyQuery(requestIndex+1, messageResult);	
				}
				
				var jsonReply  = JSON.stringify(reply);
				
				self.logTraffic(true, jsonReply.length);
				self._client.send(jsonReply);
			});
		}
	}
	catch(e) {
		console.log("Error processing inbound message " + message + ": " + e);
	}
};

/**
 * onReply - Handles a reply to one of our outbound queries
 */
Talker.prototype.onReply = function onReply(reply) {
	var query = this._sentQueries[reply['index']],
		callback;
	
	if(undefined === query) {
		throw new Error("Unknown reply");
	}
	else {
		clearTimeout(query['timeout']);
		
		callback = query['callback'];
		
		delete this._sentQueries[reply['index']];
		
		callback(reply.result);
	}
};

/**
 * onReplyError - Handles a reply error to one of our outbound queries
 */
Talker.prototype.onReplyError = function onReplyError(reply) {
	var query = this._sentQueries[reply['index']],
		callback;
	
	if(undefined === query) {
		throw new Error("Unknown reply error (wtf)");
	}
	else {
		clearTimeout(query.timeout);
		
		callback = query['callback'];
		
		delete this._sentQueries[reply['index']];
		
		callback(new Error(reply['error']));
	}
};


/*
 * sendQuery - Sends an outgoing query and waits for reply
 */
Talker.prototype.sendQuery = function sendQuery(queryPath, args, callback) {
	var self = this,
		query = {
			'query': queryPath,
			'index': this._comIndex++,
			'args': args 
		},
		message = JSON.stringify(query),
		expectingIndex = query['index']+1;
	
	this._comIndex++;
	
	this._sentQueries[expectingIndex] = {
		'sent': message,
		'expectingIndex': expectingIndex,
		'callback': callback,
		'timeout': setTimeout(function() {self.onQueryTimeout(expectingIndex)}, this._defaults.onQueryTimeoutMs)
	};
	
	this.logTraffic(true, message.length);
	this._client.send(message);
};

/*
 * onQueryTimeout - handles a query timeout by triggering the query callback with an error
 */
Talker.prototype.onQueryTimeout = function onQueryTimeout(index) {
	var callback = this._sentQueries[index].callback;
	
	delete this._sentQueries[index];
	
	throw new Error("Query timed out");
};

/**
 * onQuery - Handles new incoming requests
 */
Talker.prototype.onQuery = function onQuery(expectedIndex, request, callback) {
	var queryPath = request['query'],
		queryParts,
		curQueryPart,
		queryObject,
		queryObjectPath = '',
		request;		
	
	if(expectedIndex != request['index']) {
		throw new Error("Synchronization error");
	}
	
	/*
	 * Resolve a dot seperated object chain
	 */
	queryParts = queryPath.split('.');
	
	if(queryParts.length < 2) {
		throw new Error("Invalid query specified");
	}

	this.callQueryHandler(queryParts, request['args'], request['index'], callback);
};

/**
 * onEvent - Handles new incoming requests
 */
Talker.prototype.onEvent = function onEvent(request) {
	var queryPath = request['event'],
		queryParts,
		curQueryPart,
		queryObject,
		queryObjectPath = '',
		request;
	
	/*
	 * Resolve a dot seperated object chain
	 */
	queryParts = queryPath.split('.');
	
	if(queryParts.length < 2) {
		throw new Error("Invalid query specified");
	}

	this.callEventHandler(queryParts, request['args']);
};

/**
 * Walks a dot seperated path and calls the handler function for an incoming event
 */
Talker.prototype.callEventHandler = function callEventHandler(queryParts, args) {
	var self = this,
		queryObject = this.resolveObject(queryParts, queryParts.length-1),
		path = queryParts[queryParts.length-1],
		targetSpec,
		targetFunctionName,
		targetFunction;
		
	
	if(undefined === queryObject) {
		throw new Error("Invalid query object " + queryObject);
	}
	else {
		if(undefined === queryObject['expose']) {
			throw new Error("Target object does not expose any functions");
		}
		else {
			targetSpec = queryObject['expose'][path];
		
			if (undefined === targetSpec) {
				throw new Error("Invalid query path " + path);
			}
			else {
				targetFunctionName = targetSpec['eventHandler'];
				if (undefined === targetFunctionName) {
					throw new Error("Target is not an event handler " + path);
				}
				else {
					targetFunction = queryObject[targetFunctionName];
	
					if(undefined === targetFunction) {
						throw new Error("Event api not implemented " + path);
					}
					else {
						queryObject[targetFunctionName].call(queryObject, this, args);
					}
				}
			}
		}
	}
};

/**
 * Walks a dot seperated path and calls the handler function for an incoming query
 */
Talker.prototype.callQueryHandler = function callQueryHandler(queryParts, args, requestIndex, callback) {
	var self = this,
		queryObject = this.resolveObject(queryParts, queryParts.length-1),
		path = queryParts[queryParts.length-1],
		targetSpec,
		targetFunctionName,
		targetFunction;
		
	
	if(undefined === queryObject) {
		throw new Error("Invalid query object " + queryObject);
	}
	else {
		if(undefined === queryObject['expose']) {
			throw new Error("Target object does not expose any functions");
		}
		else {
			targetSpec = queryObject['expose'][path];
	
			if (undefined === targetSpec) {
				throw new Error("Invalid query path " + path);
			}
			else {
				targetFunctionName = targetSpec['function'];
				if (undefined === targetFunctionName) {
					throw new Error("Target is not a function " + path);
				}
				else {
					targetFunction = queryObject[targetFunctionName];
	
					if(undefined === targetFunction) {
						throw new Error("Path api not implemented " + path);
					}
					else {
						queryObject[targetFunctionName].call(queryObject, this, args, function(err, result) {
							if(err)
								callback(err, requestIndex, result);
							else {
								callback(null, requestIndex, result);
							}
						});
					}
				}
			}
		}
	}
};

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
};

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
				return undefined;
			}
			
			queryObject = childObject;
		}
	}
	
	return queryObject;
};

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
			
			this._clientObjects[object] = objectInstance;
		}

		return this._clientObjects[object];
	}
	catch(e) {
		console.log("Failed to create client object of type " + object);
		return undefined;
	}
};

/**
 * Subscribes to specified event for object which will be retransmitted to clients
 * @param {Object} object
 * @param {Object} event
 */
Talker.prototype.subscribeObject = function subscribeObject(object, eventName) {
	var self = this,
		event;
	
	object.on(eventName, function(source, message) {
		event = {
			'type': 'event',
			'event': source + '.' + eventName,
			'args': message
		};
		
		var jsonEvent = JSON.stringify(event);

		self.logTraffic(true, jsonEvent.length);
		self._client.send(jsonEvent);		
	});
};

Talker.prototype.getErrorQuery = function getErrorQuery(replyIndex, payload) {
	var error = {
		'type': 'replyError',
		'index': replyIndex,
		'error': payload
	};
	
	return error;
};

Talker.prototype.getReplyQuery = function getReplyQuery(replyIndex, payload) {
	var reply = {
		'type': 'replyData',
		'index': replyIndex,
		'result' : payload
	};
	
	return reply;
};

})(typeof exports === 'undefined'? this['talker']={}: exports);
