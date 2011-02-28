#client/m.s.io-c.compiled.js: client/message.socket.io-client.js lib/common/talker.js
#	java -jar tools/compiler.jar --js client/message.socket.io-client.js --js lib/common/talker.js --js_output_file client/m.s.io-c.compiled.js --compilation_level WHITESPACE_ONLY --warning_level DEFAULT --externs client/client.externs.js --debug
#	echo "\n\n\n\n\nDone!!\n\nNow run:\nnode example/runme.js"
	
	
client/m.s.io-c.compiled.js: client/message.socket.io-client.js lib/common/talker.js
	java -jar tools/compiler.jar --js client/message.socket.io-client.js --js lib/common/talker.js --js_output_file client/m.s.io-c.compiled.js --compilation_level ADVANCED_OPTIMIZATIONS --warning_level DEFAULT --externs client/client.externs.js
	echo "\n\n\n\n\nDone!!\n\nNow run:\nnode example/runme.js"	