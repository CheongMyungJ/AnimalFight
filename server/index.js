const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { setupSocketHandlers } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`
  ================================
    AnimalFight Server Running
    http://localhost:${PORT}
  ================================
  `);
});
