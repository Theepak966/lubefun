var io = null;

function initializeSocket(init){
    io = init;
}

function emitSocketToUser(socket, type, method, data){
	var emit = { type, method };
	if(data != null) emit.data = data;

	socket.emit('message', emit);
}

function emitSocketToAll(type, method, data){
	var emit = { type, method };
	if(data != null) emit.data = data;

	io.sockets.emit('message', emit);
}

function emitSocketToRoom(room, type, method, data){
	var emit = { type, method };
	if(data != null) emit.data = data;

	io.sockets.in(room).emit('message', emit);
}

function getSocketFromRoom(room){
	return io.sockets.in(room);
}

module.exports = {
    initializeSocket,
	emitSocketToUser, emitSocketToAll, emitSocketToRoom, getSocketFromRoom
};