client/m.s.io-c.compiled.js: client/message.socket.io-client.js lib/common/talker.js
	java -jar tools/compiler.jar --js client/message.socket.io-client.js --js lib/common/talker.js --js_output_file client/m.s.io-c.compiled.js --compilation_level ADVANCED_OPTIMIZATIONS
	echo "\n\n\n\n\nDone!!\n\nNow run:\nnode example/runme.js"