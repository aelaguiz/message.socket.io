/*
 * Yes I could have used jQuery for all of this but I am too lazy so, enjoy
 */

var ChatRoom = function ChatRoom(chatList, inputArea, list) {
	var _chatList = chatList,
		_inputText = inputArea,
		_userList = list;
		
	this.expose = {
		'joined': {
			'eventHandler': '__api__joined'
		},
		'said': {
			'eventHandler': '__api__said'
		}
	};
	
	this.__api__joined = function __api__joined(comInstance, args) {
		this.addMetaLine(args.nick + " joined");
		this.addUser(args.nick);
	}
	
	this.__api__said = function __api__said(comInstance, args) {
		this.addChat(args.nick, args.text);
	}
	
	this.addUser = function addUser(nick) {
		_userList.innerHTML += "<li>" + nick + "</li>";
	}
	
	this.addChat = function addChat(nick, text) {
		this.addLine(nick + ": " + text);
	}
	this.addLine = function addLine(chatText) {
		_chatList.innerHTML += "<li class='chat'>" + chatText + "</li>";
	}
	
	this.addMetaLine = function addMetaLine(text) {
		_chatList.innerHTML += "<li class='meta'>" + text + "</li>";
	}
}

var nickName;

function connect(container) {
	var span = document.createElement('span'),
		socket = new MSIOClient('localhost', 8084);	
	
	span.innerHTML = "Loading...<img src='/images/loading.gif'>";
	container.appendChild(span);
	
	socket.connect(function() {
		console.log("Connected");
		
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
		if(true == data.result) {
			for(var i = 0, max = data.users.length; i < max; i++) {
				var user = data.users[i];
				
				room.addUser(user);
			}
			
			for(var i = 0, max = data.history.length; i < max; i++) {
				var chat = data.history[i];
				
				room.__api__said(socket, chat);
			}
		}
		else {
			alert("Failed to join chat room!");
		}
	});
	
	inputArea.addEventListener('keydown', function(event) {
		if(13 == event.keyCode) {
			console.log("Chat: " + inputArea.value)
			
			socket.query('room.say', {'text': inputArea.value}, function(data) {
				if(true != data) {
					alert("Failed to send chat!");
				}
			});
			
			inputArea.value = '';
		}
	});
}

function getNick() {
	var container = document.createElement('div'),
		inputField = document.createElement('input');
	
	inputField.type = 'text';
	inputField.maxlength = 20;
	inputField.value = 'Nickname'
	
	container.appendChild(inputField);
	
	document.body.appendChild(container);
	
	inputField.addEventListener('keydown', function(event) {
		if(13 == event.keyCode) {
			container.removeChild(inputField);
			
			nickName = inputField.value;
			connect(container);
		}
	});
}

getNick();
