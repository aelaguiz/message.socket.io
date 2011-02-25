/*
 * Yes I could have used jQuery for all of this but I am too lazy so, enjoy
 */

var socket;

function connect(container) {
	console.log("Connecting...");
	socket = new MSIOClient('localhost', 8084);
	
	//startChat(container);
}

function startChat(container) {
	var textArea = document.createElement('textarea');
	
	console.dir(textArea);
	
	textArea.style.position = 'absolute';
	textArea.style.top = '0px';
	textArea.style.left = '0px';
	textArea.style.width='500px';
	textArea.style.height='600px';
	
	container.appendChild(textArea);
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
			
			connect(container);
		}
	});
}

getNick();
