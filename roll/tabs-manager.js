(function() {
  'use strict';

  // ============ TAB MANAGEMENT (ТОЛЬКО РЕАЛЬНЫЕ ИГРОКИ) ============
  let currentTab = 'live-bets';

  const elements = {
    tabButtons: document.querySelectorAll('.tab-button'),
    roundResultBlock: document.getElementById('round-result-block'),
    playersOnlineBlock: document.getElementById('players-online-block'),
    playersCount: document.getElementById('players-count'),
    playersList: document.querySelector('.user-templates')
  };

  function switchTab(tabName) {
    currentTab = tabName;

    // Переключаем классы между кнопками
    elements.tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
        btn.classList.add('previos-2');
        btn.classList.remove('div-wrapper-2');
      } else {
        btn.classList.remove('active');
        btn.classList.remove('previos-2');
        btn.classList.add('div-wrapper-2');
      }
    });

    if (tabName === 'live-bets') {
      // Live Bets - показываем количество онлайн игроков и список
      elements.roundResultBlock.style.display = 'none'; // НЕ показываем результат
      elements.playersOnlineBlock.style.display = 'block';
      
      // НЕ очищаем список - он будет заполнен реальными игроками из multiplayer-sync
    } else if (tabName === 'previos') {
      // Previos - показываем текущие ставки и результат
      elements.playersOnlineBlock.style.display = 'none';
      // Результат показывается только здесь (управляется из wheel-game.js)
      
      // Обновляем список реальных игроков из wheel-game.js
      if (window.updateDisplay) {
        window.updateDisplay();
      }
    }
  }

  function updatePlayersCount(count) {
    if (elements.playersCount) {
      elements.playersCount.textContent = count || 0;
    }
  }

  // ============ EVENT LISTENERS ============
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // ============ INIT ============
  // Очищаем список при загрузке
  if (elements.playersList) {
    elements.playersList.innerHTML = '';
  }
  
  // Начальный таб
  switchTab('live-bets');

  // Экспорт
  window.TabsManager = {
    getCurrentTab: () => currentTab,
    switchTab: switchTab,
    updatePlayersCount: updatePlayersCount
  };

  console.log('📋 Tabs Manager готов (только реальные игроки)');
})();
