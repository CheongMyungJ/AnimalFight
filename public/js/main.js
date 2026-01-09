document.addEventListener('DOMContentLoaded', async () => {
  const socket = new SocketClient();
  const ui = new UIManager();
  let renderer = null;
  let currentRoom = null;
  let myBet = null;
  let animals = [];
  let bettingTimerInterval = null;

  // 이모지 목록
  const emojis = [
    '😀', '😂', '😍', '🥳', '😎', '🤩', '😱', '🤔',
    '👍', '👎', '👏', '🙌', '💪', '🎉', '🔥', '💯',
    '❤️', '💔', '⭐', '🌟', '🏆', '🥇', '🎯', '🍀',
    '🦁', '🐯', '🐻', '🐺', '🦅', '🦈', '🐍', '🐊',
    '😭', '😤', '🤯', '😈', '👀', '💀', '🤑', '🥶'
  ];

  // 이모지 피커 초기화
  function initEmojiPicker(pickerId, inputId) {
    const picker = document.getElementById(pickerId);
    const input = document.getElementById(inputId);

    picker.innerHTML = emojis.map(e => `<span>${e}</span>`).join('');

    picker.addEventListener('click', (e) => {
      if (e.target.tagName === 'SPAN') {
        input.value += e.target.textContent;
        input.focus();
      }
    });
  }

  // 채팅 메시지 추가
  function addChatMessage(containerId, playerName, message, cheerData = null) {
    const container = document.getElementById(containerId);
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message${cheerData ? ' cheer' : ''}`;

    if (cheerData) {
      msgEl.innerHTML = `<span class="content">📣 ${playerName}님이 ${cheerData.emoji}${cheerData.name}을(를) 응원! +1 HP</span>`;
    } else {
      msgEl.innerHTML = `<span class="sender">${playerName}</span><span class="content">${escapeHtml(message)}</span>`;
    }

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;

    // 메시지 100개 제한
    while (container.children.length > 100) {
      container.removeChild(container.firstChild);
    }
  }

  // HTML 이스케이프
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 채팅 전송
  function sendChat(inputId) {
    const input = document.getElementById(inputId);
    const message = input.value.trim();
    if (message) {
      socket.emit('send_chat', { message });
      input.value = '';
    }
  }

  // 응원 사운드 재생
  function playCheerSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // 첫 번째 음 (높은 음)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.frequency.value = 880; // A5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.2);

    // 두 번째 음 (더 높은 음)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.frequency.value = 1108; // C#6
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc2.start(audioCtx.currentTime + 0.1);
    osc2.stop(audioCtx.currentTime + 0.3);
  }

  // 응원 효과 표시
  function showCheerEffect() {
    const effect = document.createElement('div');
    effect.className = 'cheer-effect';
    effect.textContent = '📣';
    effect.style.left = Math.random() * window.innerWidth + 'px';
    effect.style.top = (window.innerHeight - 100) + 'px';
    document.body.appendChild(effect);

    // 사운드 재생
    playCheerSound();

    setTimeout(() => effect.remove(), 1000);
  }

  try {
    await socket.connect();
    console.log('Socket connected');
    // 연결 시 방 목록 요청
    socket.emit('get_rooms');
  } catch (error) {
    ui.showToast('서버 연결 실패', 'error');
    return;
  }

  // 이모지 피커 초기화
  initEmojiPicker('waiting-emoji-picker', 'waiting-chat-input');
  initEmojiPicker('game-emoji-picker', 'game-chat-input');

  // 대기실 채팅 이벤트
  document.getElementById('waiting-emoji-btn').addEventListener('click', () => {
    document.getElementById('waiting-emoji-picker').classList.toggle('hidden');
  });

  document.getElementById('waiting-chat-send').addEventListener('click', () => {
    sendChat('waiting-chat-input');
  });

  document.getElementById('waiting-chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat('waiting-chat-input');
  });

  // 게임 중 채팅 이벤트
  document.getElementById('game-emoji-btn').addEventListener('click', () => {
    document.getElementById('game-emoji-picker').classList.toggle('hidden');
  });

  document.getElementById('game-chat-send').addEventListener('click', () => {
    sendChat('game-chat-input');
  });

  document.getElementById('game-chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat('game-chat-input');
  });

  // 응원 버튼
  document.getElementById('btn-cheer').addEventListener('click', () => {
    socket.emit('cheer');
  });

  // 다른 곳 클릭하면 이모지 피커 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-btn') && !e.target.closest('.emoji-picker')) {
      document.querySelectorAll('.emoji-picker').forEach(p => p.classList.add('hidden'));
    }
  });

  // 방 목록 새로고침
  document.getElementById('btn-refresh-rooms').addEventListener('click', () => {
    socket.emit('get_rooms');
    ui.showToast('방 목록을 새로고침했습니다');
  });

  // 방 목록에서 참가
  function joinRoomFromList(roomId) {
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
      ui.showToast('닉네임을 먼저 입력해주세요', 'error');
      return;
    }
    socket.joinRoom(roomId, name);
  }

  // 방 목록 표시
  function displayRoomList(rooms) {
    const roomListEl = document.getElementById('room-list');

    if (rooms.length === 0) {
      roomListEl.innerHTML = '<p class="no-rooms">방이 없습니다. 새로 만들어보세요!</p>';
      return;
    }

    roomListEl.innerHTML = rooms.map(room => `
      <div class="room-item" data-room-id="${room.roomId}">
        <div class="room-info-left">
          <span class="room-code">${room.roomId}</span>
          <span class="room-host">호스트: ${room.hostName || '알 수 없음'}</span>
          <span class="room-players">${room.playerCount}/${room.maxPlayers}명</span>
        </div>
        <button class="btn btn-primary btn-join" onclick="window.joinRoom('${room.roomId}')">참가</button>
      </div>
    `).join('');
  }

  // 전역 함수로 등록 (onclick에서 사용)
  window.joinRoom = joinRoomFromList;

  // 방 만들기
  document.getElementById('btn-create-room').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
      ui.showToast('닉네임을 입력해주세요', 'error');
      return;
    }
    socket.createRoom(name);
  });

  // 방 참가
  document.getElementById('btn-join-room').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim();

    if (!name) {
      ui.showToast('닉네임을 입력해주세요', 'error');
      return;
    }
    if (!roomCode) {
      ui.showToast('방 코드를 입력해주세요', 'error');
      return;
    }

    socket.joinRoom(roomCode, name);
  });

  // 방 나가기
  document.getElementById('btn-leave-room').addEventListener('click', () => {
    socket.leaveRoom();
    currentRoom = null;
    ui.showScreen('lobby');
    socket.emit('get_rooms'); // 방 목록 새로고침
  });

  // 게임 시작
  document.getElementById('btn-start-game').addEventListener('click', () => {
    socket.startGame();
  });

  // 배팅 슬라이더
  document.getElementById('bet-slider').addEventListener('input', (e) => {
    document.getElementById('bet-amount-display').textContent = e.target.value;
  });

  // 배팅 확정
  document.getElementById('btn-place-bet').addEventListener('click', () => {
    if (!myBet) {
      ui.showToast('동물을 선택해주세요', 'error');
      return;
    }

    const amount = parseInt(document.getElementById('bet-slider').value);
    socket.placeBet(myBet.animalId, amount);
  });

  // 로비로 돌아가기
  document.getElementById('btn-back-to-lobby').addEventListener('click', () => {
    socket.leaveRoom();
    currentRoom = null;
    ui.showScreen('lobby');
    socket.emit('get_rooms'); // 방 목록 새로고침
  });

  // 소켓 이벤트 핸들러
  socket.on('room_list', (data) => {
    displayRoomList(data.rooms);
  });

  socket.on('room_created', (data) => {
    currentRoom = data.room;
    ui.updateRoomDisplay(data.room, socket.socket.id);
    ui.showScreen('waiting');
    ui.showToast(`방이 생성되었습니다: ${data.roomId}`, 'success');
    // 채팅 초기화
    document.getElementById('waiting-chat-messages').innerHTML = '';
  });

  socket.on('room_update', (data) => {
    currentRoom = data.room;
    ui.updateRoomDisplay(data.room, socket.socket.id);

    // 상태에 따라 화면 전환
    if (data.room.state === 'waiting' || data.room.state === 'ready') {
      ui.showScreen('waiting');
      // 배팅 버튼 초기화
      const betBtn = document.getElementById('btn-place-bet');
      if (betBtn) {
        betBtn.disabled = true;
        betBtn.textContent = '배팅 확정';
      }
    }
  });

  socket.on('player_joined', (data) => {
    ui.showToast(`${data.playerName}님이 참가했습니다`);
  });

  socket.on('player_left', (data) => {
    ui.showToast('플레이어가 나갔습니다');
  });

  socket.on('betting_start', (data) => {
    currentRoom = data.room;
    animals = data.animals;
    myBet = null;

    ui.setupBettingScreen(animals, data.room.currentRound, (animal) => {
      myBet = { animalId: animal.id };
      document.getElementById('selected-animal-name').textContent = animal.emoji + ' ' + animal.name;
      document.getElementById('btn-place-bet').disabled = false;
    });

    ui.showScreen('betting');

    if (bettingTimerInterval) {
      clearInterval(bettingTimerInterval);
    }

    bettingTimerInterval = ui.startBettingTimer(Math.floor(data.bettingTime / 1000));
  });

  socket.on('bet_confirmed', (data) => {
    myBet = data.bet;
    ui.showToast(`${data.animal.emoji} ${data.animal.name}에 ${data.bet.amount}코인 배팅 완료!`, 'success');
    document.getElementById('btn-place-bet').disabled = true;
    document.getElementById('btn-place-bet').textContent = '배팅 완료';
  });

  socket.on('game_start', (data) => {
    currentRoom = data.room;

    if (bettingTimerInterval) {
      clearInterval(bettingTimerInterval);
    }

    const canvas = document.getElementById('game-canvas');
    renderer = new GameRenderer(canvas);
    renderer.startRendering();

    ui.updateGameScreen(data.room.currentRound, 8, myBet, animals);
    ui.showScreen('game');

    // 게임 채팅 초기화
    document.getElementById('game-chat-messages').innerHTML = '';
  });

  socket.on('position_update', (data) => {
    if (renderer) {
      renderer.updateAnimals(data.positions);

      const aliveCount = data.positions.filter(a => a.isAlive).length;
      document.getElementById('remaining-count').textContent = aliveCount;
    }
  });

  socket.on('damage', (data) => {
    if (renderer) {
      renderer.addDamageAnimation(data.animal1.id, data.animal1.damage);
      renderer.addDamageAnimation(data.animal2.id, data.animal2.damage);
    }
  });

  socket.on('animal_eaten', (data) => {
    if (renderer) {
      renderer.addEatAnimation(data.winner, data.loser);
    }

    const loserAnimal = animals.find(a => a.id === data.loser.id);
    ui.showToast(`${data.winner.emoji}${data.winner.name}이(가) ${data.loser.emoji}${data.loser.name}을(를) 잡아먹었습니다!`);
  });

  socket.on('game_result', (data) => {
    if (renderer) {
      renderer.stopRendering();
      renderer.showWinner(data.winner);
    }

    setTimeout(() => {
      ui.showResultScreen(data, socket.socket.id, animals);

      const myResult = data.results.find(r => r.playerId === socket.socket.id);
      if (myResult) {
        ui.updateCoinsDisplay(myResult.newBalance);
      }
    }, 2000);
  });

  socket.on('game_over', (data) => {
    setTimeout(() => {
      ui.showGameOverScreen(data, socket.socket.id);
    }, 5000);
  });

  socket.on('error', (data) => {
    ui.showToast(data.message, 'error');
  });

  // 채팅 메시지 수신
  socket.on('chat_message', (data) => {
    // 현재 화면에 따라 적절한 채팅창에 메시지 추가
    const waitingChat = document.getElementById('waiting-chat-messages');
    const gameChat = document.getElementById('game-chat-messages');

    if (waitingChat && document.getElementById('waiting-screen').classList.contains('active')) {
      addChatMessage('waiting-chat-messages', data.playerName, data.message);
    }
    if (gameChat && document.getElementById('game-screen').classList.contains('active')) {
      addChatMessage('game-chat-messages', data.playerName, data.message);
    }
  });

  // 응원 효과 수신
  socket.on('cheer_effect', (data) => {
    // 게임 중 채팅창에 응원 메시지 표시 (동물 정보 포함)
    addChatMessage('game-chat-messages', data.playerName, '', {
      name: data.animalName,
      emoji: data.animalEmoji
    });

    // 화면에 응원 이펙트 표시
    showCheerEffect();

    // 동물 체력바 업데이트는 position_update에서 자동으로 처리됨
  });
});
