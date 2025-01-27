const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io')

const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require ('./utils/users')

const port = process.env.PORT;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

// server (emit) -> client (receive) - countUpdate
// client (emit) -> server (receive) - increment

io.on('connection', (socket) =>
{
    console.log('New websocket connection');

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });
        
        if(error)
        {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit('message_to_client', generateMessage('Admin' ,'Welcome!'));
        socket.broadcast.to(user.room).emit('message_to_client', generateMessage('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', 
        {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on('message', (msg, callback) =>
    {  
        const user = getUser(socket.id);
        io.to(user.room).emit('message_to_client', generateMessage(user.username, msg));
        callback('Delivered');
    });

    socket.on('sendLocation', (location, callback) =>
    {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username ,`https://google.com/maps?q=${location.latitude},${location.longitude}`));
        callback();
    })

    socket.on('disconnect', () =>
    {
        const user = removeUser(socket.id);

        if(user)
        {
            io.to(user.room).emit('message_to_client', generateMessage('Admin', `${user.username} has left`));
            io.to(user.room).emit('roomData',
            {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }        
    })
});

server.listen(port, () =>
{
    console.log('Server is up on port ' + port);
});