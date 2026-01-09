module.exports = {
  // 클라이언트 -> 서버
  CLIENT: {
    GET_ROOMS: 'get_rooms',
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    PLACE_BET: 'place_bet',
    START_GAME: 'start_game',
    PLAYER_READY: 'player_ready',
    SEND_CHAT: 'send_chat',
    CHEER: 'cheer'
  },

  // 서버 -> 클라이언트
  SERVER: {
    ROOM_LIST: 'room_list',
    ROOM_CREATED: 'room_created',
    ROOM_UPDATE: 'room_update',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    BETTING_START: 'betting_start',
    BET_CONFIRMED: 'bet_confirmed',
    GAME_START: 'game_start',
    POSITION_UPDATE: 'position_update',
    DAMAGE: 'damage',
    ANIMAL_EATEN: 'animal_eaten',
    GAME_RESULT: 'game_result',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over',
    ERROR: 'error',
    CHAT_MESSAGE: 'chat_message',
    CHEER_EFFECT: 'cheer_effect',
    ITEM_SPAWN: 'item_spawn',
    ITEM_PICKUP: 'item_pickup'
  }
};
