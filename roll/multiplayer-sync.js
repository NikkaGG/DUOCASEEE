(function() {
  'use strict';

  let ws = null;
  let gameState = {
    status: 'waiting', // waiting, betting, spinning, finished
    players: [],
    timer: 0,
    startTime: null
  };
  
  let timerActive = false; // Флаг чтобы не запускать таймер несколько раз

  // Ждём WebSocket
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ WebSocket готов для синхронизации');
      console.log('🔌 WebSocket подключен:', ws.connected);
      console.log('🆔 Socket ID:', ws.socket.id);
      initSync();
    } else {
      console.log('⏳ Ожидание WebSocket...');
      setTimeout(waitForWebSocket, 500);
    }
  }

  function initSync() {
    console.log('🚀 Инициализация синхронизации Roll...');
    
    // Подписываемся на глобальное состояние Roll
    ws.socket.emit('join_game', { game: 'roll' });
    console.log('📡 Отправлен запрос join_game для roll');
    console.log('🔗 Подключение к комнате global_roll');

    // Получаем текущее состояние
    ws.socket.on('game_state_sync', (state) => {
      console.log('🔄 Синхронизация состояния:', state);
      
      const wasWaiting = gameState.status === 'waiting';
      gameState = state;
      
      // ТОЛЬКО updateUI (внутри уже есть обновление колеса)
      updateUI();
      
      // Запускаем таймер ТОЛЬКО ПРИ ПЕРЕХОДЕ waiting -> betting
      if (state.status === 'betting' && state.startTime && wasWaiting && !timerActive) {
        timerActive = true;
        syncTimer(state.startTime, state.timer);
      }
      
      // Сбрасываем флаг когда игра закончилась
      if (state.status === 'waiting') {
        timerActive = false;
      }
    });

    // Новый игрок сделал ставку
    ws.socket.on('player_bet', (data) => {
      console.log('💰 Игрок сделал ставку:', data);
      
      // Добавляем/обновляем игрока (С ЦВЕТОМ!)
      const existingPlayer = gameState.players.find(p => p.userId === data.userId);
      if (existingPlayer) {
        existingPlayer.bet += data.bet;
        // Обновляем цвет если пришел
        if (data.color) {
          existingPlayer.color = data.color;
        }
      } else {
        gameState.players.push({
          userId: data.userId,
          nickname: data.nickname,
          photoUrl: data.photoUrl,
          bet: data.bet,
          color: data.color // ДОБАВЛЯЕМ ЦВЕТ!
        });
      }

      // Синхронизируем всех игроков с колесом
      syncPlayersToWheel();
      updateUI();
    });

    // Игра началась
    ws.socket.on('game_started', (data) => {
      console.log('🎮 Игра началась! Таймер:', data.timer);
      gameState.status = 'betting';
      gameState.startTime = data.startTime;
      gameState.timer = data.timer;
      
      syncTimer(data.startTime, data.timer);
    });

    // Крутим колесо
    console.log('🎯 Подписка на событие spin_wheel...');
    ws.socket.on('spin_wheel', (data) => {
      console.log('📥 ПОЛУЧЕНО СОБЫТИЕ spin_wheel!', data);
      console.log('🎰 Крутим колесо! Победитель:', data.winner);
      console.log('📊 Текущие игроки:', gameState.players);
      gameState.status = 'spinning';
      
      // НЕ очищаем игроков! Колесо должно крутиться с текущими игроками
      if (window.rollGame && window.rollGame.spin) {
        console.log('✅ Вызываем window.rollGame.spin(', data.winner, ')');
        window.rollGame.spin(data.winner);
      } else {
        console.error('❌ window.rollGame.spin не доступен!');
      }
      
      // Показываем победителя через 5 секунд (после анимации)
      setTimeout(() => {
        const winner = gameState.players.find(p => p.userId === data.winner);
        if (winner) {
          console.log('🏆 Победитель:', winner.nickname);
          if (window.rollGame && window.rollGame.showResult) {
            window.rollGame.showResult({ winner: data.winner, amount: data.amount });
          }
        }
        
        // Очищаем колесо через 3 секунды после показа победителя
        setTimeout(() => {
          console.log('🔄 Сброс игры');
          gameState.status = 'waiting';
          gameState.players = [];
          
          // Сброс UI
          const waitText = document.querySelector('.wait span:first-child');
          if (waitText) {
            waitText.style.display = 'inline';
            waitText.style.color = '#6a6a6a';
            waitText.textContent = 'Wait...';
          }
          const playText = document.querySelector('.wait span:last-child');
          if (playText) {
            playText.style.display = 'none';
          }
          
          updateUI();
        }, 3000);
      }, 5000);
    });

    // Игра завершена (удалено - теперь обрабатывается в spin_wheel)
    ws.socket.on('game_finished', (data) => {
      console.log('🏁 Игра завершена (событие получено)');
    });

    // Запрашиваем текущее состояние
    ws.socket.emit('get_game_state', { game: 'roll' });
  }

  // Синхронизация таймера
  function syncTimer(startTime, duration) {
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    let timeLeft = duration - elapsed;

    if (timeLeft <= 0) {
      timeLeft = 0;
    }

    console.log(`⏱️ Таймер: ${timeLeft} сек (прошло ${elapsed} сек)`);

    const timerInterval = setInterval(() => {
      timeLeft--;
      
      // Обновляем таймер в wheel-game
      const waitText = document.querySelector('.wait span:last-child');
      if (waitText) {
        if (timeLeft > 0) {
          waitText.style.display = 'inline';
          waitText.style.color = '#39d811';
          waitText.textContent = `${timeLeft}s`;
        } else {
          waitText.textContent = 'Play';
          waitText.style.color = '#39d811';
        }
      }
      const waitSpan = document.querySelector('.wait span:first-child');
      if (waitSpan) {
        waitSpan.style.display = 'none';
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        // Оставляем "Play" без мигания
        if (waitText) {
          waitText.textContent = 'Play';
          waitText.style.color = '#39d811';
          waitText.style.display = 'inline';
        }
        console.log('⏰ Таймер закончился, ожидаем spin_wheel от сервера...');
      }
    }, 1000);

    // Обновляем UI сразу
    const waitText = document.querySelector('.wait span:last-child');
    if (waitText) {
      waitText.style.display = 'inline';
      waitText.style.color = '#39d811';
      waitText.textContent = `${timeLeft}s`;
    }
    const waitSpan = document.querySelector('.wait span:first-child');
    if (waitSpan) {
      waitSpan.style.display = 'none';
    }
  }

  // Сделать ставку
  function placeBet(amount) {
    if (!ws) {
      console.error('❌ WebSocket не подключен');
      return;
    }

    // Получаем данные пользователя из разных источников
    let userId, nickname, photoUrl;

    // Приоритет 1: Telegram WebApp
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      userId = tgUser.id;
      nickname = tgUser.first_name || tgUser.username || 'Player';
      photoUrl = tgUser.photo_url || null;
    }
    // Приоритет 2: TelegramUserData
    else if (window.TelegramUserData) {
      userId = window.TelegramUserData.id;
      nickname = window.TelegramUserData.first_name || window.TelegramUserData.username || 'Player';
      photoUrl = window.TelegramUserData.photo_url || null;
    }
    // Приоритет 3: WebSocket currentUser
    else if (ws.currentUser) {
      userId = ws.currentUser.id;
      nickname = ws.currentUser.nickname || 'Player';
      photoUrl = ws.currentUser.photoUrl || null;
    }
    // Fallback
    else {
      userId = 'user_' + Date.now();
      nickname = 'Player';
      photoUrl = null;
    }

    console.log('💰 Отправляем ставку:', { userId, nickname, photoUrl, bet: amount });
    console.log('📡 WebSocket состояние:', { connected: ws.connected, socketId: ws.socket?.id });

    ws.socket.emit('place_bet', {
      game: 'roll',
      userId,
      nickname,
      photoUrl,
      bet: amount
    });

    console.log('✅ Событие place_bet отправлено');
  }

  // Обновление UI (без мерцания)
  function updateUI() {
    // Обновляем колесо через wheel-game
    if (window.rollGame && window.rollGame.updateState) {
      window.rollGame.updateState(gameState);
    }

    // Обновляем список игроков в зависимости от активной вкладки
    const currentTab = window.TabsManager ? window.TabsManager.getCurrentTab() : 'previos';
    
    // Обновляем счетчик онлайн игроков для Live Bets
    if (currentTab === 'live-bets' && window.TabsManager) {
      window.TabsManager.updatePlayersCount(gameState.players.length);
    }

    const playersList = document.querySelector('.user-templates');
    if (!playersList) return;

    // Удаляем старых игроков которых нет в текущем состоянии
    const currentPlayerIds = new Set(gameState.players.map(p => p.userId));
    const existingPlayers = playersList.querySelectorAll('[data-player-id]');
    existingPlayers.forEach(el => {
      const playerId = parseInt(el.getAttribute('data-player-id'));
      if (!currentPlayerIds.has(playerId)) {
        el.remove(); // Удаляем фейковых/старых игроков
      }
    });

    gameState.players.forEach(player => {
      // Пропускаем невалидных игроков
      if (!player || !player.userId || !player.nickname) return;
      
      // Ищем существующий блок игрока
      let playerEl = playersList.querySelector(`[data-player-id="${player.userId}"]`);
      
      if (!playerEl) {
        // Создаем новый блок только если игрока нет
        playerEl = document.createElement('div');
        playerEl.className = 'win';
        playerEl.setAttribute('data-player-id', player.userId);
        
        let avatarHTML = '';
        if (player.photoUrl) {
          avatarHTML = `<div class="avatar-2" style="background-image: url(${player.photoUrl}); background-size: cover; background-position: center; width: 32px; height: 32px; border-radius: 50%;"></div>`;
        } else {
          const initial = player.nickname ? player.nickname[0].toUpperCase() : 'P';
          avatarHTML = `<div class="avatar-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; width: 32px; height: 32px; border-radius: 50%; font-size: 16px;">${initial}</div>`;
        }
        
        // В Live Bets показываем только ник и аватарку, в Previos - полную информацию
        if (currentTab === 'live-bets') {
          playerEl.innerHTML = `
            <div class="acc-inf">
              <div class="avatar-wrapper">
                ${avatarHTML}
              </div>
              <div class="n-k">
                <div class="n-k-2">${player.nickname || 'Player'}</div>
              </div>
            </div>
            <div class="div-wrapper-2">
              <div class="text-wrapper-14">-</div>
            </div>
            <div class="element-wrapper">
              <div class="element-3">-</div>
            </div>
          `;
        } else {
          playerEl.innerHTML = `
            <div class="acc-inf">
              <div class="avatar-wrapper">
                ${avatarHTML}
              </div>
              <div class="n-k">
                <div class="n-k-2">${player.nickname || 'Player'}</div>
              </div>
            </div>
            <div class="div-wrapper-2">
              <div class="text-wrapper-14" data-bet-amount>${player.bet}</div>
            </div>
            <div class="element-wrapper">
              <div class="element-3" data-win-amount>-</div>
            </div>
          `;
        }
        playersList.appendChild(playerEl);
      } else {
        // Обновляем только цифры в Previos
        if (currentTab === 'previos') {
          const betElement = playerEl.querySelector('[data-bet-amount]');
          if (betElement) betElement.textContent = player.bet;
        }
      }
    });
  }
  // Синхронизация игроков с колесом
  function syncPlayersToWheel() {
    if (!window.rollGame || !window.rollGame.updateState) return;
    
    // Преобразуем формат для wheel-game (фильтруем невалидных игроков)
    const wheelPlayers = gameState.players
      .filter(player => player && player.userId && player.nickname) // Только валидные игроки
      .map((player, index) => ({
        id: player.userId,
        username: player.nickname,
        photo_url: player.photoUrl,
        betAmount: player.bet || 0,
        color: player.color || '#39d811', // ДОБАВЛЯЕМ ЦВЕТ!
        isUser: false,
        isBot: false
      }));
    
    console.log('🔄 syncPlayersToWheel:', wheelPlayers);
    window.rollGame.updateState({ players: wheelPlayers });
  }
  // Экспорт
  window.RollSync = {
    placeBet,
    getState: () => gameState,
    syncPlayersToWheel
  };

  // Запуск
  waitForWebSocket();

  console.log('✅ Roll Sync инициализирован');

  // УБРАНО: Периодический запрос вызывал задержку
  // Обновления приходят через game_state_sync автоматически

})();
