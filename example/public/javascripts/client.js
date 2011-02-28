/*
 * Simple chat client. Probably should have just used jQuery for my entity creation, etc - but this was easy enough.
 * 
 * This demo is pretty crappy in that I used a random mix of css and html, I dynamically generate entities in some places and statically create (and toggle visibility) in other places. 
 * 
 * Don't judge me.
 * 
 * Amir Elaguizy
 */
 
//http://ejohn.org/blog/javascript-array-remove/
arrayRemove = function(arr, from, to) {
  	var rest = arr.slice((to || from) + 1 || arr.length);
  	arr.length = from < 0 ? arr.length + from : from;
	return arr.push.apply(arr, rest);
};

var ChatRoom = function ChatRoom(chatList, inputArea, list) {
	var _chatList = chatList,
		_inputText = inputArea,
		_userList = list,
		_nickList = [];
		
	/*
	 * Handle three events from the communications layer 
	 */
	this.expose = {
		'joined': {
			'eventHandler': '__api__joined'
		},
		'left': {
			'eventHandler': '__api__left'
		},
		'said': {
			'eventHandler': '__api__said'
		}
	};
	
	this.__api__joined = function __api__joined(comInstance, args) {
		this._addMetaLine(args['nick'] + " joined");
		this.addUser(args['nick']);
	}
	
	this.__api__left = function __api__left(comInstance, args) {
		this._addMetaLine(args['nick'] + " left");
		this.delUser(args['nick']);
	}
	
	this.__api__said = function __api__said(comInstance, args) {
		this._addChat(args['nick'], args['text']);
	}
	
	this.addUser = function addUser(nick) {
		_nickList.push(nick);
		this._addUserHTML(nick);
	}
	
	this.delUser = function delUser(nick) {
		/*
		 * Remove the user from our user list
		 */
		for(var i = 0, max = _nickList.length; i < max; i++) {
			if(nick === _nickList[i]) {
				arrayRemove(_nickList, i);
				break;
			}
		}
		
		/*
		 * Rebuild the user list html entity
		 */
		_userList.innerHTML = '';
		
		for(var i = 0, max = _nickList.length; i < max; i++) {
			this._addUserHTML(_nickList[i]);	
		}
	}
	
	this._addChat = function addChat(nick, text) {
		this._addLine(nick + ": " + text);
	}
	this._addLine = function addLine(chatText) {
		_chatList.innerHTML += "<li class='chat'>" + chatText + "</li>";
		_chatList.scrollTop = _chatList.scrollHeight;
	}
	
	this._addMetaLine = function addMetaLine(text) {
		_chatList.innerHTML += "<li class='meta'>" + text + "</li>";
		_chatList.scrollTop = _chatList.scrollHeight;
	}
	
	this._addUserHTML = function addUserHTML(nick) {
		_userList.innerHTML += "<li>" + nick + "</li>";
	}
}

/*
 * Don't look under the skirt
 */
 
 
/*
 * Skirt:
 */
var nickName;

function connect(container) {
	var span = document.createElement('span'),
		socket = new MSIOClient(null, 8084);	
	
	span.innerHTML = "Loading...<img src='/images/loading.gif'>";
	container.appendChild(span);
	
	socket.connect(function() {
		container.removeChild(span);
	
		startChat(container, socket);
	});
}

function startChat(container, socket) {
	var chatList = document.createElement('ul'),
		inputArea = document.createElement('input'),
		userList = document.createElement('ul');
	
	chatList.style.position = 'absolute';
	chatList.style.top = '20px';
	chatList.style.left = '20px';
	chatList.style.width='480px';
	chatList.style.height='270px';
	chatList.className = 'chatlist';
	
	inputArea.style.position = 'absolute';
	inputArea.style.top = '330px';
	inputArea.style.left = '20px';
	inputArea.style.width = '500px';
	inputArea.value = 'Type here...'
	
	userList.style.position = 'absolute';
	userList.style.top = '20px';
	userList.style.left = '540px';
	
	container.appendChild(chatList);
	container.appendChild(inputArea);
	container.appendChild(userList);
	
	var room = new ChatRoom(chatList, inputArea, userList);
	joinChat(socket, room, inputArea);
}

function joinChat(socket, room, inputArea) {
	socket.addQueryObject('room', room);
		
	socket.query('room.join', {'nick': nickName}, function(data) {
		if(data instanceof Error) {
			alert("Failed to join chat room: " + data.message);
		}
		else {
			var e = document.getElementById('infoz');
          	e.style.display = 'block';
          
			for(var i = 0, max = data['users'].length; i < max; i++) {
				var user = data['users'][i];
				
				room.addUser(user);
			}
			
			for(var i = 0, max = data['history'].length; i < max; i++) {
				var chat = data['history'][i];
				
				room.__api__said(socket, chat);
			}
		}
	});
	
	inputArea.addEventListener('keydown', function(event) {
		if(13 == event.keyCode) {
			var text = inputArea.value;
			
			if(text.length > 0) {
				socket.query('room.say', {'text': text}, function(data) {
					if(data instanceof Error) {
						alert("Failed to send chat!");
					}
				});
			}
			
			inputArea.value = '';
		}
	});
	
	var _clearCount = 0;
	inputArea.addEventListener('click', function(event) {
		if(0 == _clearCount++) {
			inputArea.value = '';			
		}
	});
}

function getNick() {
	var container = document.createElement('div'),
		inputField = document.createElement('input'),
		instructions = document.createElement('instructions');
	
	inputField.type = 'text';
	inputField.maxlength = 20;
	inputField.value = 'Nickname' + Math.ceil(Math.random() * 100);
	
	instructions.innerHTML = '<ol><li>Enter Nickname</li><li>Hit Enter</li></ol>'
	
	container.appendChild(inputField);
	container.appendChild(instructions);
	
	document.body.appendChild(container);
	
	inputField.addEventListener('keydown', function(event) {
		if(13 == event.keyCode) {
			container.removeChild(inputField);
			container.removeChild(instructions);
			
			nickName = inputField.value;
			connect(container);
		}
	});
}

getNick();
