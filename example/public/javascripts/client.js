/*
 * Yes I could have used jQuery for all of this but I am too lazy so, enjoy
 */

var ChatRoom = function ChatRoom() {
	this.expose = {
		'joined': {
			'eventHandler': '__api__joined'
		}
	};
	
	this.__api__joined = function __api__joined(comInstance, args) {
		console.log("Someone joined");
		console.dir(args);
	}
}

var socket,
	nickName,
	room = new ChatRoom();

function connect(container) {
	var span = document.createElement('span');	
	
	span.innerHTML = "Loading...<img src='/images/loading.gif'>";
	container.appendChild(span);
	
	socket = new MSIOClient('localhost', 8084);
	
	socket.addQueryObject('room', room);
	
	socket.connect(function() {
		console.log("Connected");
		
		container.removeChild(span);
		
		socket.query('room.join', {'nick': nickName}, function(res) {
			console.log("Received " + res);
		});
		
		startChat(container);
	});
}

function startChat(container) {
	var textArea = document.createElement('textarea'),
		inputArea = document.createElement('input'),
		list = document.createElement('ul');
	
	textArea.style.position = 'absolute';
	textArea.style.top = '20px';
	textArea.style.left = '20px';
	textArea.style.width='500px';
	textArea.style.height='300px';
	
	inputArea.style.position = 'absolute';
	inputArea.style.top = '330px';
	inputArea.style.left = '20px';
	inputArea.style.width = '500px';
	inputArea.value = 'Type here...'
	
	list.style.position = 'absolute';
	list.style.top = '20px';
	list.style.left = '540px';
	
	container.appendChild(textArea);
	container.appendChild(inputArea);
	container.appendChild(list);
}

function getNick() {
	var container = document.createElement('div'),
		inputField = document.createElement('input');
	
	inputField.type = 'text';
	inputField.maxlength = 20;
	inputField.value = 'Nickname Here'
	
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
