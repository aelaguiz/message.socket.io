## message.socket.io

Communications framework for both client and server built on socket.io and node.js

## What is it?

It's an easy way to tie a node.js backend to a javascript-enabled front end via websockets (socket.io) without having to worry about the details.

Check out this <a href='https://gist.github.com/847609'>gist</a> to see how simple it is to use.

## Demo

<a href='http://serv1.aelag.com:8084'>Chat Demo</a>

## Getting Started

git clone git@github.com:aelaguiz/message.socket.io.git

cd message.socket.io

git submodule init

git submodule update

make

node example/runme.js

Navigate to http://localhost:8084 in your favorite web browser.

Your favorite web browser should be chrome, because that's all I have tested with.

## Notes

This is basically just a bunch of code I wrote for my own experimentation, I wrote it in Ubuntu 10.10 using chrome beta 10+. That's the only place I've tested any of it, but I've been lead to believe it works elsewhere.


## License

There is no license really, you can steal it and take credit for it. Whatever.
