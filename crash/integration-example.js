/**
 * Пример интеграции CrashGraphAnimation в существующий проект
 * Этот файл показывает как добавить новую анимацию в crash-websocket.js
 */

// ========================================
// ВАРИАНТ 1: Полная замена существующего Canvas
// ========================================

// В начале crash-websocket.js добавьте:
let crashGraphAnimation = null;

// В блоке инициализации элементов (после строки 99):
function initCrashGraphAnimation() {
  // Проверяем есть ли Canvas
  let canvas = document.getElementById('crashGraph');
  
  // Если нет - создаем
  if (!canvas) {
    const gameContainer = document.querySelector('.game');
    canvas = document.createElement('canvas');
    canvas.id = 'crashGraph';
    canvas.width = 400;
    canvas.height = 256;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    gameContainer.appendChild(canvas);
  }
  
  // Инициализируем анимацию
  crashGraphAnimation = new CrashGraphAnimation('crashGraph', {
    baseGrowth: 0.0001,        // Стандартная скорость роста
    maxPoints: 120,            // Оптимальное количество точек
    trailLength: 8,            // Длина следа
    particleCount: 35,         // Количество частиц
    growColor: '#00ff88',      // Зеленый цвет роста
    crashColor: '#ff3366',     // Красный цвет краха
    glowSize: 20,              // Размер свечения
    lineWidth: 3               // Толщина линии
  });
}

// Вызовите эту функцию при загрузке:
// window.addEventListener('DOMContentLoaded', initCrashGraphAnimation);


// ========================================
// ВАРИАНТ 2: Интеграция в WebSocket обработчики
// ========================================

// Найдите функцию handleGameState и добавьте:
function handleGameState(data) {
  switch (data.state) {
    case 'waiting':
      // Сброс анимации при ожидании
      if (crashGraphAnimation) {
        crashGraphAnimation.reset();
      }
      // ... остальной код
      break;
      
    case 'flying':
      // Запуск анимации
      if (crashGraphAnimation) {
        crashGraphAnimation.start();
      }
      
      // Обновление множителя в UI
      setInterval(() => {
        if (crashGraphAnimation && crashGraphAnimation.isRunning) {
          const multiplier = crashGraphAnimation.currentMultiplier.toFixed(2) + 'x';
          elements.currentMultiplier.textContent = multiplier;
        }
      }, 50); // Обновление каждые 50ms
      
      // ... остальной код
      break;
      
    case 'crashed':
      // Триггер краша
      if (crashGraphAnimation) {
        crashGraphAnimation.crash(data.crashPoint);
        
        // Остановка через 2 секунды (после анимации)
        setTimeout(() => {
          crashGraphAnimation.stop();
        }, 2000);
      }
      // ... остальной код
      break;
  }
}


// ========================================
// ВАРИАНТ 3: Минимальная интеграция
// ========================================

// Просто добавьте в конец crash-websocket.js:

(function integrateGraphAnimation() {
  // Дождитесь загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', integrateGraphAnimation);
    return;
  }
  
  // Проверка что библиотека загружена
  if (typeof CrashGraphAnimation === 'undefined') {
    console.error('CrashGraphAnimation не загружена! Добавьте скрипт в HTML.');
    return;
  }
  
  // Создание Canvas если его нет
  const gameContainer = document.querySelector('.game');
  if (!gameContainer) {
    console.error('Контейнер .game не найден');
    return;
  }
  
  let canvas = document.getElementById('crashGraph');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'crashGraph';
    canvas.width = 400;
    canvas.height = 256;
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1'
    });
    gameContainer.insertBefore(canvas, gameContainer.firstChild);
  }
  
  // Инициализация
  window.crashGraphAnimation = new CrashGraphAnimation('crashGraph', {
    baseGrowth: 0.0001,
    maxPoints: 120,
    trailLength: 8,
    particleCount: 35,
    growColor: '#00ff88',
    crashColor: '#ff3366',
    glowSize: 20,
    lineWidth: 3
  });
  
  console.log('✅ CrashGraphAnimation успешно интегрирована!');
})();


// ========================================
// ВАРИАНТ 4: Интеграция через события
// ========================================

// Если у вас есть система событий:
class CrashGameEventHandler {
  constructor() {
    this.graph = null;
    this.init();
  }
  
  init() {
    this.graph = new CrashGraphAnimation('crashGraph');
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Подписка на события игры
    window.addEventListener('crash-game:start', () => {
      this.onGameStart();
    });
    
    window.addEventListener('crash-game:crash', (e) => {
      this.onGameCrash(e.detail.crashPoint);
    });
    
    window.addEventListener('crash-game:reset', () => {
      this.onGameReset();
    });
  }
  
  onGameStart() {
    if (this.graph) {
      this.graph.start();
      console.log('🚀 Игра началась');
    }
  }
  
  onGameCrash(crashPoint) {
    if (this.graph) {
      this.graph.crash(crashPoint);
      console.log(`💥 Краш на ${crashPoint.toFixed(2)}x`);
      
      setTimeout(() => {
        this.graph.stop();
      }, 2000);
    }
  }
  
  onGameReset() {
    if (this.graph) {
      this.graph.reset();
      console.log('🔄 Игра сброшена');
    }
  }
  
  // Методы для эмуляции событий (для тестирования)
  emitStart() {
    window.dispatchEvent(new CustomEvent('crash-game:start'));
  }
  
  emitCrash(crashPoint) {
    window.dispatchEvent(new CustomEvent('crash-game:crash', {
      detail: { crashPoint }
    }));
  }
  
  emitReset() {
    window.dispatchEvent(new CustomEvent('crash-game:reset'));
  }
}

// Использование:
// const crashHandler = new CrashGameEventHandler();
// crashHandler.emitStart();        // Запуск игры
// crashHandler.emitCrash(3.45);    // Краш на 3.45x
// crashHandler.emitReset();        // Сброс


// ========================================
// ВАРИАНТ 5: Полная автономная интеграция
// ========================================

class CrashGameManager {
  constructor(options = {}) {
    this.options = {
      canvasId: 'crashGraph',
      wsUrl: null,
      autoConnect: true,
      ...options
    };
    
    this.graph = null;
    this.ws = null;
    this.gameState = 'waiting';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.init();
  }
  
  init() {
    // Инициализация графика
    this.initGraph();
    
    // Подключение к WebSocket если указан URL
    if (this.options.wsUrl && this.options.autoConnect) {
      this.connectWebSocket();
    }
    
    // UI обработчики
    this.setupUI();
  }
  
  initGraph() {
    try {
      this.graph = new CrashGraphAnimation(this.options.canvasId, {
        baseGrowth: 0.0001,
        maxPoints: 120,
        trailLength: 8,
        particleCount: 35,
        growColor: '#00ff88',
        crashColor: '#ff3366',
        glowSize: 20,
        lineWidth: 3
      });
      console.log('✅ График инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации графика:', error);
    }
  }
  
  connectWebSocket() {
    try {
      this.ws = new WebSocket(this.options.wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket подключен');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket ошибка:', error);
      };
      
      this.ws.onclose = () => {
        console.log('⚠️ WebSocket отключен');
        this.handleDisconnect();
      };
    } catch (error) {
      console.error('❌ Ошибка подключения WebSocket:', error);
    }
  }
  
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'game_starting':
          this.onGameStarting(data);
          break;
        case 'game_started':
          this.onGameStarted(data);
          break;
        case 'game_crashed':
          this.onGameCrashed(data);
          break;
        case 'tick':
          this.onTick(data);
          break;
      }
    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
    }
  }
  
  onGameStarting(data) {
    this.gameState = 'starting';
    if (this.graph) {
      this.graph.reset();
    }
    console.log('⏳ Игра начинается через', data.countdown, 'сек');
  }
  
  onGameStarted(data) {
    this.gameState = 'flying';
    if (this.graph) {
      this.graph.start();
    }
    console.log('🚀 Игра началась!');
  }
  
  onGameCrashed(data) {
    this.gameState = 'crashed';
    if (this.graph) {
      this.graph.crash(data.crashPoint);
      setTimeout(() => {
        this.graph.stop();
      }, 2000);
    }
    console.log('💥 Краш на', data.crashPoint, 'x');
  }
  
  onTick(data) {
    // Синхронизация множителя с сервером (опционально)
    if (this.graph && data.currentMultiplier) {
      // Можно использовать для отладки
      const diff = Math.abs(this.graph.currentMultiplier - data.currentMultiplier);
      if (diff > 0.1) {
        console.warn('⚠️ Рассинхронизация множителя:', diff);
      }
    }
  }
  
  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`🔄 Переподключение через ${delay}ms (попытка ${this.reconnectAttempts})`);
      setTimeout(() => this.connectWebSocket(), delay);
    } else {
      console.error('❌ Превышено количество попыток переподключения');
    }
  }
  
  setupUI() {
    // Обновление множителя в UI
    if (this.graph) {
      setInterval(() => {
        if (this.graph.isRunning) {
          const multiplierEl = document.getElementById('currentMultiplier');
          if (multiplierEl) {
            multiplierEl.textContent = this.graph.currentMultiplier.toFixed(2) + 'x';
          }
        }
      }, 50);
    }
  }
  
  // Публичные методы
  start() {
    if (this.graph) this.graph.start();
  }
  
  crash(multiplier) {
    if (this.graph) this.graph.crash(multiplier);
  }
  
  reset() {
    if (this.graph) this.graph.reset();
  }
  
  destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.graph) {
      this.graph.stop();
      this.graph = null;
    }
  }
}

// Использование:
// const gameManager = new CrashGameManager({
//   wsUrl: 'wss://your-server.com/crash',
//   autoConnect: true
// });


// ========================================
// Экспорт для использования в других модулях
// ========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initCrashGraphAnimation,
    CrashGameEventHandler,
    CrashGameManager
  };
}

if (typeof window !== 'undefined') {
  window.CrashGameIntegration = {
    initCrashGraphAnimation,
    CrashGameEventHandler,
    CrashGameManager
  };
}
