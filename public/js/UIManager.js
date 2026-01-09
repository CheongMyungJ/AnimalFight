class UIManager {
  constructor() {
    this.screens = {
      lobby: document.getElementById('lobby-screen'),
      waiting: document.getElementById('waiting-screen'),
      betting: document.getElementById('betting-screen'),
      game: document.getElementById('game-screen'),
      result: document.getElementById('result-screen'),
      gameover: document.getElementById('gameover-screen')
    };

    this.toast = document.getElementById('toast');
    this.toastTimeout = null;
  }

  showScreen(screenName) {
    Object.keys(this.screens).forEach(key => {
      this.screens[key].classList.remove('active');
    });

    if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
    }
  }

  showToast(message, type = 'info') {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toast.textContent = message;
    this.toast.className = 'toast show ' + type;

    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 3000);
  }

  updateRoomDisplay(room, mySocketId) {
    document.getElementById('room-code-display').textContent = room.roomId;
    document.getElementById('player-count').textContent = room.playerCount;

    const playersList = document.getElementById('players');
    playersList.innerHTML = '';

    room.players.forEach(player => {
      const li = document.createElement('li');
      li.textContent = player.name;

      if (player.id === room.hostId) {
        li.classList.add('host');
      }

      if (player.hasBet) {
        const betStatus = document.createElement('span');
        betStatus.className = 'bet-status';
        betStatus.textContent = '배팅 완료';
        li.appendChild(betStatus);
      }

      playersList.appendChild(li);
    });

    const myPlayer = room.players.find(p => p.id === mySocketId);
    if (myPlayer) {
      this.updateCoinsDisplay(myPlayer.coins);
    }

    const startBtn = document.getElementById('btn-start-game');
    const minNotice = document.querySelector('.min-players-notice');

    if (room.hostId === mySocketId) {
      startBtn.style.display = 'inline-block';
      startBtn.disabled = !room.canStart;
    } else {
      startBtn.style.display = 'none';
    }

    minNotice.style.display = room.playerCount < room.minPlayers ? 'block' : 'none';
  }

  updateCoinsDisplay(coins) {
    const displays = [
      'coins-display',
      'betting-coins',
      'game-coins'
    ];

    displays.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = coins;
    });
  }

  setupBettingScreen(animals, currentRound, onSelect) {
    document.getElementById('round-number').textContent = currentRound;

    const grid = document.getElementById('animal-grid');
    grid.innerHTML = '';

    animals.forEach(animal => {
      const btn = document.createElement('button');
      btn.className = 'animal-btn';
      btn.dataset.id = animal.id;
      btn.innerHTML = `
        <img class="animal-img" src="/assets/images/animals/${animal.type}.svg" alt="${animal.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
        <span class="emoji" style="display:none;">${animal.emoji}</span>
        <span class="name">${animal.name}</span>
      `;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.animal-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onSelect(animal);
      });

      grid.appendChild(btn);
    });

    document.getElementById('selected-animal-name').textContent = '없음';
    document.getElementById('btn-place-bet').disabled = true;
    document.getElementById('bet-slider').value = 50;
    document.getElementById('bet-amount-display').textContent = 50;
  }

  startBettingTimer(seconds, onEnd) {
    const timerEl = document.getElementById('betting-timer');
    let remaining = seconds;

    timerEl.textContent = remaining;

    const interval = setInterval(() => {
      remaining--;
      timerEl.textContent = remaining;

      if (remaining <= 0) {
        clearInterval(interval);
        if (onEnd) onEnd();
      }
    }, 1000);

    return interval;
  }

  updateGameScreen(round, remainingCount, myBet, animals) {
    document.getElementById('game-round-number').textContent = round;
    document.getElementById('remaining-count').textContent = remainingCount;

    if (myBet && animals) {
      const animal = animals.find(a => a.id === myBet.animalId);
      document.getElementById('my-bet-animal').textContent = animal ? animal.emoji + ' ' + animal.name : '';
      document.getElementById('my-bet-amount').textContent = myBet.amount;
    }
  }

  showResultScreen(data, mySocketId, animals) {
    document.getElementById('result-round').textContent = data.round;

    const winnerAnimal = animals.find(a => a.id === data.winningAnimalId);
    const winnerEmojiEl = document.getElementById('winner-emoji');

    if (winnerAnimal) {
      winnerEmojiEl.innerHTML = `<img src="/assets/images/animals/${winnerAnimal.type}.svg" alt="${winnerAnimal.name}" class="winner-img" onerror="this.outerHTML='${winnerAnimal.emoji}'">`;
    }
    document.getElementById('winner-name').textContent = winnerAnimal ? winnerAnimal.name : '';

    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';

    data.results.forEach(result => {
      const div = document.createElement('div');
      div.className = 'result-item ' + (result.won ? 'win' : 'lose');

      const betAnimal = animals.find(a => a.id === result.betAnimalId);
      const betInfo = betAnimal ? `${betAnimal.emoji} ${result.betAmount}코인` : '배팅 없음';

      div.innerHTML = `
        <span>${result.playerName} (${betInfo})</span>
        <span class="profit">${result.profit >= 0 ? '+' : ''}${result.profit}코인</span>
      `;

      resultsList.appendChild(div);
    });

    const myResult = data.results.find(r => r.playerId === mySocketId);
    const myResultEl = document.getElementById('my-result');

    if (myResult) {
      myResultEl.className = 'my-result ' + (myResult.won ? 'win' : 'lose');
      myResultEl.innerHTML = myResult.won
        ? `축하합니다! +${myResult.reward}코인 획득! (현재: ${myResult.newBalance}코인)`
        : `아쉽네요... -${myResult.betAmount}코인 (현재: ${myResult.newBalance}코인)`;
    }

    this.showScreen('result');
  }

  showGameOverScreen(data, mySocketId) {
    const eliminatedNames = data.eliminated.map(e => e.playerName).join(', ');
    document.getElementById('gameover-message').textContent =
      `${eliminatedNames}님이 코인을 모두 잃어 게임이 종료되었습니다.`;

    const finalResults = document.getElementById('final-results');
    finalResults.innerHTML = '';

    data.finalResults.sort((a, b) => b.newBalance - a.newBalance);

    data.finalResults.forEach((result, index) => {
      const div = document.createElement('div');
      div.className = 'final-result-item';

      if (result.newBalance <= 0) {
        div.classList.add('eliminated');
      }

      div.innerHTML = `
        <span>${index + 1}. ${result.playerName}</span>
        <span class="coins">${result.newBalance}코인</span>
      `;

      finalResults.appendChild(div);
    });

    this.showScreen('gameover');
  }
}

window.UIManager = UIManager;
