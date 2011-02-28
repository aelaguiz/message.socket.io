var MessageServer = require('./message.socket.io').Server,
	EventEmitter = require('events').EventEmitter;

//http://ejohn.org/blog/javascript-array-remove/
arrayRemove = function(arr, from, to) {
  	var rest = arr.slice((to || from) + 1 || arr.length);
  	arr.length = from < 0 ? arr.length + from : from;
	return arr.push.apply(arr, rest);
};

ChatRoom = function ChatRoom() {
	/*
	 * Expose two functions to the communications layer, joining and talking
	 */ 
	this.expose = {
		'say': {
			'function': '__api__say'
		},
		'join': {
			'function': '__api__join'
		}
	};
	
	this.nickList = [];
	this.clients = [];
	this.chatLines = [];
}

ChatRoom.prototype.__proto__ = EventEmitter.prototype;

ChatRoom.prototype.__api__say = function __api__say(comInstance, args, callback) {
	var text = args.text,
		nick,
		lineObj;
		
	if(undefined === text) {
		callback(new Error("Client did not say shit"));
	}
	else {
		nick = this.clients[comInstance.getInstanceId()];
		
		lineObj = {'nick': nick, 'text': text};
		this.chatLines.push(lineObj);
		
		callback(null, {});
		
		this.emit('said', 'room', lineObj);
	}
}

ChatRoom.prototype.__api__join = function __api__join(comInstance, args, callback) {
	var nick = args.nick;
		
	if(undefined === nick) {
		callback(new Error("Client did not specify nickname"));
	}
	else if(!this.isNickAvailable(nick)) {
		callback(new Error("Nickname is already in use"));
	}
	else {
		this.clients[comInstance.getInstanceId()] = nick;
		
		comInstance.subscribeObject(this, 'joined');
		comInstance.subscribeObject(this, 'left');
		comInstance.subscribeObject(this, 'said');
		
		callback(null, {'users': this.nickList, history: this.chatLines.slice(-10)});
		
		this.emit('joined', 'room', {'nick': nick});
		
		this.nickList.push(nick);
	}
}

ChatRoom.prototype.onDisconnect = function onDisconnect(comInstance) {
	var nick = this.clients[comInstance.getInstanceId()];
	
	if(undefined !== nick) {
		delete this.clients[comInstance.getInstanceId()];
		this.removeNick(nick);
		
		this.emit('left', 'room', {'nick': nick});
	}
}

ChatRoom.prototype.isNickAvailable = function isNickAvailable(nick) {
	for(var i = 0, max = this.nickList.length; i < max; i++) {
		if(nick == this.nickList[i]) {
			return false;
		}
	}
	
	return true;
}

ChatRoom.prototype.removeNick = function removeNick(nick) {
	for(var i = 0, max = this.nickList.length; i < max; i++) {
		if(nick == this.nickList[i]) {
			arrayRemove(this.nickList, i);
			break;
		}
	}
}


exports.DemoServer = function DemoServer(httpServer) {
	var _server = new MessageServer(httpServer),
		_room = new ChatRoom();
	
	_server.addQueryObject('room', _room);
	
	_server.on('disconnect', function(client) {
		_room.onDisconnect(client);
	});
}