const { v4: uuidv4 } = require('uuid');
const GameRoom = require('../game/GameRoom');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRoomMap = new Map();
  }

  createRoom(hostSocketId, hostName) {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const room = new GameRoom(roomId, hostSocketId, hostName);

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(hostSocketId, roomId);

    return room;
  }

  joinRoom(roomId, socketId, playerName) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: '방을 찾을 수 없습니다.' };
    }

    const result = room.addPlayer(socketId, playerName);

    if (result.success) {
      this.playerRoomMap.set(socketId, roomId);
    }

    return { ...result, room };
  }

  leaveRoom(socketId) {
    const roomId = this.playerRoomMap.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const isEmpty = room.removePlayer(socketId);
    this.playerRoomMap.delete(socketId);

    if (isEmpty) {
      this.rooms.delete(roomId);
      return { roomDeleted: true, roomId };
    }

    return { roomDeleted: false, room, roomId };
  }

  getRoomBySocketId(socketId) {
    const roomId = this.playerRoomMap.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId);
  }

  getRoomById(roomId) {
    return this.rooms.get(roomId);
  }

  getAvailableRooms() {
    const available = [];

    this.rooms.forEach((room, roomId) => {
      if (room.state === 'waiting' || room.state === 'ready') {
        available.push({
          roomId,
          hostName: room.players.get(room.hostId)?.name,
          playerCount: room.players.size,
          maxPlayers: 8
        });
      }
    });

    return available;
  }
}

module.exports = RoomManager;
