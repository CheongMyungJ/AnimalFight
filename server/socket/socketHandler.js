const RoomManager = require('../managers/RoomManager');
const EVENTS = require('./events');
const config = require('../config/gameConfig');

const roomManager = new RoomManager();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // 방 목록 요청
    socket.on(EVENTS.CLIENT.GET_ROOMS, () => {
      const rooms = roomManager.getAvailableRooms();
      socket.emit(EVENTS.SERVER.ROOM_LIST, { rooms });
    });

    socket.on(EVENTS.CLIENT.CREATE_ROOM, (data) => {
      const { playerName } = data;

      if (!playerName || playerName.trim().length === 0) {
        socket.emit(EVENTS.SERVER.ERROR, { message: '이름을 입력해주세요.' });
        return;
      }

      const room = roomManager.createRoom(socket.id, playerName.trim());
      socket.join(room.roomId);

      socket.emit(EVENTS.SERVER.ROOM_CREATED, {
        roomId: room.roomId,
        room: room.getState()
      });

      // 모든 클라이언트에게 방 목록 업데이트
      io.emit(EVENTS.SERVER.ROOM_LIST, { rooms: roomManager.getAvailableRooms() });

      console.log(`Room created: ${room.roomId} by ${playerName}`);
    });

    socket.on(EVENTS.CLIENT.JOIN_ROOM, (data) => {
      const { roomId, playerName } = data;

      if (!playerName || playerName.trim().length === 0) {
        socket.emit(EVENTS.SERVER.ERROR, { message: '이름을 입력해주세요.' });
        return;
      }

      const result = roomManager.joinRoom(roomId, socket.id, playerName.trim());

      if (!result.success) {
        socket.emit(EVENTS.SERVER.ERROR, { message: result.error });
        return;
      }

      socket.join(roomId);

      io.to(roomId).emit(EVENTS.SERVER.ROOM_UPDATE, {
        room: result.room.getState()
      });

      // 모든 클라이언트에게 방 목록 업데이트
      io.emit(EVENTS.SERVER.ROOM_LIST, { rooms: roomManager.getAvailableRooms() });

      console.log(`${playerName} joined room ${roomId}`);
    });

    socket.on(EVENTS.CLIENT.LEAVE_ROOM, () => {
      handleLeaveRoom(socket, io);
    });

    socket.on(EVENTS.CLIENT.START_GAME, () => {
      const room = roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        socket.emit(EVENTS.SERVER.ERROR, { message: '방을 찾을 수 없습니다.' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit(EVENTS.SERVER.ERROR, { message: '호스트만 게임을 시작할 수 있습니다.' });
        return;
      }

      const result = room.startBettingPhase();

      if (!result.success) {
        socket.emit(EVENTS.SERVER.ERROR, { message: result.error });
        return;
      }

      io.to(room.roomId).emit(EVENTS.SERVER.BETTING_START, {
        room: room.getState(),
        bettingTime: config.BETTING_TIME,
        animals: config.ANIMALS
      });

      room.bettingTimer = setTimeout(() => {
        startGameIfReady(room, io);
      }, config.BETTING_TIME);

      console.log(`Betting phase started in room ${room.roomId}`);
    });

    socket.on(EVENTS.CLIENT.PLACE_BET, (data) => {
      const { animalId, amount } = data;
      const room = roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        socket.emit(EVENTS.SERVER.ERROR, { message: '방을 찾을 수 없습니다.' });
        return;
      }

      const result = room.placeBet(socket.id, animalId, amount);

      if (!result.success) {
        socket.emit(EVENTS.SERVER.ERROR, { message: result.error });
        return;
      }

      socket.emit(EVENTS.SERVER.BET_CONFIRMED, {
        bet: result.bet,
        animal: config.ANIMALS[animalId]
      });

      io.to(room.roomId).emit(EVENTS.SERVER.ROOM_UPDATE, {
        room: room.getState()
      });

      if (room.allPlayersBet()) {
        if (room.bettingTimer) {
          clearTimeout(room.bettingTimer);
        }
        startGameIfReady(room, io);
      }
    });

    // 채팅 메시지
    socket.on(EVENTS.CLIENT.SEND_CHAT, (data) => {
      const { message } = data;
      const room = roomManager.getRoomBySocketId(socket.id);

      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player) return;

      // 메시지 길이 제한
      const sanitizedMessage = message.substring(0, 200);

      io.to(room.roomId).emit(EVENTS.SERVER.CHAT_MESSAGE, {
        playerId: socket.id,
        playerName: player.name,
        message: sanitizedMessage,
        timestamp: Date.now()
      });
    });

    // 응원 (배팅한 동물 체력 +1)
    socket.on(EVENTS.CLIENT.CHEER, () => {
      const room = roomManager.getRoomBySocketId(socket.id);

      if (!room) return;
      if (room.state !== 'playing') return;

      const player = room.players.get(socket.id);
      if (!player) return;

      // 배팅 정보 가져오기
      const bet = room.bets.get(socket.id);
      if (!bet) return;

      // 응원 쿨다운 체크 (1초)
      const now = Date.now();
      if (player.lastCheerTime && now - player.lastCheerTime < 1000) {
        return;
      }
      player.lastCheerTime = now;

      // 배팅한 동물 찾아서 체력 회복
      const betAnimalId = bet.animalId;
      const animalInfo = config.ANIMALS[betAnimalId];

      if (room.gameEngine) {
        const animal = room.gameEngine.animals.find(a => a.id === betAnimalId && a.isAlive);
        if (animal && animal.hp < animal.maxHp) {
          animal.hp = Math.min(animal.maxHp, animal.hp + 1);

          // 응원 효과 브로드캐스트
          io.to(room.roomId).emit(EVENTS.SERVER.CHEER_EFFECT, {
            playerId: socket.id,
            playerName: player.name,
            animalId: betAnimalId,
            animalName: animalInfo.name,
            animalEmoji: animalInfo.emoji,
            newHp: animal.hp,
            maxHp: animal.maxHp
          });
        }
      }
    });

    socket.on('disconnect', () => {
      handleLeaveRoom(socket, io);
      console.log(`Player disconnected: ${socket.id}`);
    });
  });
}

function handleLeaveRoom(socket, io) {
  const result = roomManager.leaveRoom(socket.id);

  if (!result) return;

  socket.leave(result.roomId);

  if (!result.roomDeleted) {
    io.to(result.roomId).emit(EVENTS.SERVER.ROOM_UPDATE, {
      room: result.room.getState()
    });

    io.to(result.roomId).emit(EVENTS.SERVER.PLAYER_LEFT, {
      playerId: socket.id
    });
  }

  // 모든 클라이언트에게 방 목록 업데이트
  io.emit(EVENTS.SERVER.ROOM_LIST, { rooms: roomManager.getAvailableRooms() });
}

function startGameIfReady(room, io) {
  const onPositionUpdate = (positions) => {
    io.to(room.roomId).emit(EVENTS.SERVER.POSITION_UPDATE, { positions });
  };

  const onDamage = (data) => {
    io.to(room.roomId).emit(EVENTS.SERVER.DAMAGE, data);
  };

  const onAnimalEaten = (data) => {
    io.to(room.roomId).emit(EVENTS.SERVER.ANIMAL_EATEN, data);
  };

  const onGameEnd = (data) => {
    const roundResult = room.endRound(data.winner.id);

    io.to(room.roomId).emit(EVENTS.SERVER.GAME_RESULT, {
      winner: data.winner,
      duration: data.duration,
      ...roundResult
    });

    if (roundResult.isGameOver) {
      io.to(room.roomId).emit(EVENTS.SERVER.GAME_OVER, {
        eliminated: roundResult.eliminated,
        finalResults: roundResult.results
      });
    } else {
      setTimeout(() => {
        room.prepareNextRound();
        io.to(room.roomId).emit(EVENTS.SERVER.ROOM_UPDATE, {
          room: room.getState()
        });
      }, 5000);
    }
  };

  const onItemSpawn = (item) => {
    io.to(room.roomId).emit(EVENTS.SERVER.ITEM_SPAWN, { item });
  };

  const onItemPickup = (data) => {
    io.to(room.roomId).emit(EVENTS.SERVER.ITEM_PICKUP, data);
  };

  room.startGame(onPositionUpdate, onAnimalEaten, onGameEnd, onDamage, onItemSpawn, onItemPickup);

  io.to(room.roomId).emit(EVENTS.SERVER.GAME_START, {
    room: room.getState(),
    animals: config.ANIMALS
  });

  console.log(`Game started in room ${room.roomId}`);
}

module.exports = { setupSocketHandlers, roomManager };
