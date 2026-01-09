module.exports = {
  // 게임 설정
  ANIMALS: [
    { id: 0, type: 'lion', name: '사자', emoji: '🦁' },
    { id: 1, type: 'tiger', name: '호랑이', emoji: '🐯' },
    { id: 2, type: 'bear', name: '곰', emoji: '🐻' },
    { id: 3, type: 'wolf', name: '늑대', emoji: '🐺' },
    { id: 4, type: 'eagle', name: '독수리', emoji: '🦅' },
    { id: 5, type: 'shark', name: '상어', emoji: '🦈' },
    { id: 6, type: 'snake', name: '뱀', emoji: '🐍' },
    { id: 7, type: 'crocodile', name: '악어', emoji: '🐊' }
  ],

  // 플레이어 설정
  INITIAL_COINS: 300,
  MIN_BET: 10,
  MAX_BET: 100,
  HOUSE_CUT: 0.05,

  // 방 설정
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 8,

  // 게임 타이밍
  BETTING_TIME: 15000,        // 배팅 시간 15초
  TARGET_DURATION_MIN: 50000, // 최소 게임 시간 50초
  TARGET_DURATION_MAX: 60000, // 최대 게임 시간 60초
  POSITION_UPDATE_RATE: 50,   // 위치 업데이트 주기 50ms (20 FPS)

  // 캔버스 설정
  CANVAS: {
    WIDTH: 800,
    HEIGHT: 600,
    ANIMAL_SIZE: 50
  },

  // 아이템 설정
  ITEMS: [
    { id: 0, type: 'health', name: '체력 회복', emoji: '❤️', effect: { hp: 20 } },
    { id: 1, type: 'speed', name: '스피드 부스트', emoji: '⚡', effect: { speedMultiplier: 2, duration: 3000 } },
    { id: 2, type: 'damage', name: '데미지 부스트', emoji: '💪', effect: { damageMultiplier: 2 } },
    { id: 3, type: 'shield', name: '쉴드', emoji: '🛡️', effect: { damageReduction: 0.5 } }
  ],
  ITEM_SPAWN_INTERVAL: 5000,  // 5초마다 아이템 스폰
  ITEM_MAX_COUNT: 3,          // 동시에 최대 3개
  ITEM_SIZE: 30,              // 아이템 크기

  // 방 상태
  ROOM_STATES: {
    WAITING: 'waiting',
    READY: 'ready',
    BETTING: 'betting',
    PLAYING: 'playing',
    RESULT: 'result',
    GAME_OVER: 'game_over'
  }
};
