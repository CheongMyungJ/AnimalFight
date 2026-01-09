const GameEngine = require('./GameEngine');
const config = require('../config/gameConfig');
const { ROOM_STATES } = config;

class GameRoom {
  constructor(roomId, hostId, hostName) {
    this.roomId = roomId;
    this.hostId = hostId;
    this.state = ROOM_STATES.WAITING;
    this.players = new Map();
    this.bets = new Map();
    this.currentRound = 0;
    this.gameEngine = null;
    this.bettingTimer = null;

    this.addPlayer(hostId, hostName);
  }

  addPlayer(socketId, name) {
    if (this.players.size >= config.MAX_PLAYERS) {
      return { success: false, error: '방이 가득 찼습니다.' };
    }

    if (this.state !== ROOM_STATES.WAITING && this.state !== ROOM_STATES.READY) {
      return { success: false, error: '게임이 진행 중입니다.' };
    }

    this.players.set(socketId, {
      id: socketId,
      name: name,
      coins: config.INITIAL_COINS,
      isReady: false
    });

    this.updateState();
    return { success: true };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.bets.delete(socketId);

    if (this.hostId === socketId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }

    this.updateState();
    return this.players.size === 0;
  }

  updateState() {
    if (this.state === ROOM_STATES.WAITING || this.state === ROOM_STATES.READY) {
      this.state = this.players.size >= config.MIN_PLAYERS
        ? ROOM_STATES.READY
        : ROOM_STATES.WAITING;
    }
  }

  canStart() {
    return this.state === ROOM_STATES.READY && this.players.size >= config.MIN_PLAYERS;
  }

  startBettingPhase() {
    if (!this.canStart()) {
      return { success: false, error: '게임을 시작할 수 없습니다.' };
    }

    this.state = ROOM_STATES.BETTING;
    this.bets.clear();
    this.currentRound++;

    return { success: true };
  }

  placeBet(socketId, animalId, amount) {
    if (this.state !== ROOM_STATES.BETTING) {
      return { success: false, error: '배팅 시간이 아닙니다.' };
    }

    const player = this.players.get(socketId);
    if (!player) {
      return { success: false, error: '플레이어를 찾을 수 없습니다.' };
    }

    if (amount < config.MIN_BET || amount > config.MAX_BET) {
      return { success: false, error: `배팅 금액은 ${config.MIN_BET}~${config.MAX_BET} 사이여야 합니다.` };
    }

    if (amount > player.coins) {
      return { success: false, error: '코인이 부족합니다.' };
    }

    if (animalId < 0 || animalId > 7) {
      return { success: false, error: '유효하지 않은 동물입니다.' };
    }

    this.bets.set(socketId, { animalId, amount });

    return { success: true, bet: { animalId, amount } };
  }

  allPlayersBet() {
    return this.bets.size === this.players.size;
  }

  startGame(onPositionUpdate, onAnimalEaten, onGameEnd, onDamage) {
    this.state = ROOM_STATES.PLAYING;

    this.players.forEach((player, socketId) => {
      const bet = this.bets.get(socketId);
      if (bet) {
        player.coins -= bet.amount;
      }
    });

    this.gameEngine = new GameEngine(
      this.roomId,
      onPositionUpdate,
      onAnimalEaten,
      onGameEnd,
      onDamage
    );

    this.gameEngine.start();
    return { success: true };
  }

  calculateResults(winningAnimalId) {
    const results = [];
    const animalCount = config.ANIMALS.length; // 동물 수 (8마리)

    this.players.forEach((player, socketId) => {
      const bet = this.bets.get(socketId);

      if (!bet) {
        results.push({
          playerId: socketId,
          playerName: player.name,
          won: false,
          betAmount: 0,
          reward: 0,
          profit: 0,
          newBalance: player.coins
        });
        return;
      }

      if (bet.animalId === winningAnimalId) {
        const reward = Math.floor(bet.amount * animalCount * (1 - config.HOUSE_CUT));
        player.coins += reward;

        results.push({
          playerId: socketId,
          playerName: player.name,
          won: true,
          betAnimalId: bet.animalId,
          betAmount: bet.amount,
          reward: reward,
          profit: reward - bet.amount,
          newBalance: player.coins
        });
      } else {
        results.push({
          playerId: socketId,
          playerName: player.name,
          won: false,
          betAnimalId: bet.animalId,
          betAmount: bet.amount,
          reward: 0,
          profit: -bet.amount,
          newBalance: player.coins
        });
      }
    });

    return results;
  }

  checkElimination() {
    const eliminated = [];

    this.players.forEach((player, socketId) => {
      if (player.coins <= 0) {
        eliminated.push({
          playerId: socketId,
          playerName: player.name
        });
      }
    });

    return eliminated;
  }

  endRound(winningAnimalId) {
    this.state = ROOM_STATES.RESULT;

    const results = this.calculateResults(winningAnimalId);
    const eliminated = this.checkElimination();

    if (eliminated.length > 0) {
      this.state = ROOM_STATES.GAME_OVER;
    }

    return {
      round: this.currentRound,
      winningAnimalId,
      results,
      eliminated,
      isGameOver: eliminated.length > 0
    };
  }

  prepareNextRound() {
    this.state = ROOM_STATES.READY;
    this.bets.clear();
    if (this.gameEngine) {
      this.gameEngine.stop();
      this.gameEngine = null;
    }
  }

  getState() {
    const playerList = [];
    this.players.forEach((player, socketId) => {
      const bet = this.bets.get(socketId);
      playerList.push({
        ...player,
        hasBet: !!bet
      });
    });

    return {
      roomId: this.roomId,
      hostId: this.hostId,
      state: this.state,
      players: playerList,
      currentRound: this.currentRound,
      playerCount: this.players.size,
      minPlayers: config.MIN_PLAYERS,
      canStart: this.canStart()
    };
  }
}

module.exports = GameRoom;
