class SocketClient {
  constructor() {
    this.socket = null;
    this.eventHandlers = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io();

      this.socket.on('connect', () => {
        console.log('Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('error', (data) => {
        if (this.eventHandlers['error']) {
          this.eventHandlers['error'](data);
        }
      });
    });
  }

  on(event, callback) {
    this.eventHandlers[event] = callback;
    this.socket.on(event, callback);
  }

  off(event) {
    delete this.eventHandlers[event];
    this.socket.off(event);
  }

  emit(event, data) {
    this.socket.emit(event, data);
  }

  createRoom(playerName) {
    this.emit('create_room', { playerName });
  }

  joinRoom(roomId, playerName) {
    this.emit('join_room', { roomId: roomId.toUpperCase(), playerName });
  }

  leaveRoom() {
    this.emit('leave_room');
  }

  startGame() {
    this.emit('start_game');
  }

  placeBet(animalId, amount) {
    this.emit('place_bet', { animalId, amount });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

window.SocketClient = SocketClient;
