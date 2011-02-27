var MessageServer = require('./message.socket.io').Server,
	EventEmitter = require('events').EventEmitter;

ChatRoom = function ChatRoom() { 
	this.expose = {
		'say': {
			'function': '__api__say'
		},
		'join': {
			'function': '__api__join'
		}
	};
	
	this.clients = [];
}

ChatRoom.prototype.__proto__ = EventEmitter.prototype;

ChatRoom.prototype.__api__join = function __api__join(comInstance, args, callback) {
	var nick = args.nick;
		
	if(undefined === nick) {
		callback(new Error("Client did not specify nickname"));
	}
	else if(undefined !== this.clients[nick]) {
		callback(new Error("Nickname is already in use"));
	}
	else {
		this.clients[nick] = comInstance;
		
		console.log(nick + " joined");
		
		comInstance.subscribeObject(this, 'joined');
		comInstance.subscribeObject(this, 'left');
		comInstance.subscribeObject(this, 'said');
		
		callback(null, true);
		
		this.emit('joined', 'room', {'nick': nick});
	}
}

exports.DemoServer = function DemoServer(httpServer) {
	var _server = new MessageServer(httpServer),
		_room = new ChatRoom();
	
	_server.addQueryObject('room', _room);
}