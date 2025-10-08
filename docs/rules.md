Ты — senior frontend-разработчик, специализирующийся на Telegram Mini Apps и азартных играх. Ты эксперт в vanilla JavaScript, Canvas API и WebSocket для реалтайм-приложений.

КОНТЕКСТ
Проект — Telegram Mini App с несколькими играми (BlackJack, Crash, Mines и др.).
Текущая структура проекта:
BOT/
├── crash/
│   ├── crash-graph-animation.js  ← ЭТОТ ФАЙЛ НУЖНО ПЕРЕРАБОТАТЬ
│   ├── crash-graph-demo.html
│   ├── crash-graph.css
│   └── crash-websocket.js
├── server/
│   └── ... (Node.js + Socket.IO)
└── ...
Что уже есть:

crash-websocket.js — подключение к серверу через Socket.IO
crash-graph-demo.html — HTML-разметка игры
crash-graph.css — стили интерфейса

Что нужно:
Переработать crash-graph-animation.js для создания плавной анимации стрелки и правильного отображения коэффициента, как в референсе (фото 2).

ЗАДАЧА
Перепиши файл crash-graph-animation.js с нуля, добавив:
1️⃣ Класс CrashGraph
Основной класс для управления Canvas-анимацией:
javascriptclass CrashGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.multiplier = 1.00;
    this.crashed = false;
    this.arrow = {
      x: 0, y: 0, angle: 0, speed: 0
    };
    
    this.init();
  }
  
  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.startAnimation();
  }
  
  resizeCanvas() {
    // Адаптация под размер контейнера
  }
  
  startAnimation() {
    // Запуск анимационного цикла через requestAnimationFrame
  }
  
  update(deltaTime) {
    // Обновление позиции стрелки и коэффициента
  }
  
  draw() {
    // Отрисовка стрелки, траектории и сетки
  }
  
  updateMultiplier(newMultiplier) {
    // Плавное обновление коэффициента
  }
  
  triggerCrash() {
    // Анимация "улета" стрелки
  }
}
2️⃣ Анимация стрелки
Стрелка должна:

Двигаться по кривой траектории (не строго вертикально)
Ускоряться по мере роста коэффициента
Поворачиваться по направлению движения
Плавно улетать при крэше с эффектом исчезания

Математика траектории:
javascript// Комбинация линейного движения + синусоида для "живости"
calculateArrowPosition(multiplier, time) {
  const baseY = this.canvas.height * 0.8;
  const progress = (multiplier - 1.0) / 10.0; // 0..1 для множителя 1-11x
  
  return {
    x: this.canvas.width * 0.3 + Math.sin(time * 0.002) * 40,
    y: baseY - progress * this.canvas.height * 0.7,
    angle: Math.atan2(-progress, Math.sin(time * 0.002))
  };
}
3️⃣ Плавное обновление коэффициента
javascriptanimateMultiplier(targetValue, duration = 100) {
  const start = this.multiplier;
  const startTime = performance.now();
  
  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function для плавности
    const eased = this.easeOutQuad(progress);
    this.multiplier = start + (targetValue - start) * eased;
    
    // Обновление DOM-элемента с коэффициентом
    this.updateMultiplierDisplay();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };
  
  requestAnimationFrame(update);
}

easeOutQuad(t) {
  return t * (2 - t); // Плавное замедление
}
4️⃣ Эффект крэша
javascripttriggerCrash() {
  this.crashed = true;
  const crashStartTime = performance.now();
  const duration = 800; // мс
  
  const crashAnimation = (currentTime) => {
    const elapsed = currentTime - crashStartTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Стрелка улетает вверх с ускорением
    this.arrow.y -= progress * 50;
    this.arrow.speed += progress * 5;
    this.arrow.angle += progress * 0.5;
    this.arrow.opacity = 1 - progress;
    
    if (progress < 1) {
      requestAnimationFrame(crashAnimation);
    } else {
      this.reset();
    }
  };
  
  requestAnimationFrame(crashAnimation);
}
5️⃣ Отрисовка стрелки
javascriptdrawArrow() {
  const ctx = this.ctx;
  
  ctx.save();
  ctx.translate(this.arrow.x, this.arrow.y);
  ctx.rotate(this.arrow.angle);
  
  // Свечение
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 20;
  
  // Тело стрелки
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.moveTo(0, -30); // Наконечник
  ctx.lineTo(-10, 10);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();
  
  // Хвост стрелки (линия)
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, 40);
  ctx.stroke();
  
  ctx.restore();
}

ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
✅ Обязательные элементы:

Canvas настройка:

javascript// Retina-ready canvas
resizeCanvas() {
  const rect = this.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  this.canvas.width = rect.width * dpr;
  this.canvas.height = rect.height * dpr;
  this.ctx.scale(dpr, dpr);
  
  this.canvas.style.width = rect.width + 'px';
  this.canvas.style.height = rect.height + 'px';
}

Оптимизация рендера:

javascript// Ограничение частоты отрисовки до 60 FPS
startAnimation() {
  let lastTime = performance.now();
  const targetFPS = 60;
  const frameTime = 1000 / targetFPS;
  
  const loop = (currentTime) => {
    const deltaTime = currentTime - lastTime;
    
    if (deltaTime >= frameTime) {
      this.update(deltaTime);
      this.draw();
      lastTime = currentTime - (deltaTime % frameTime);
    }
    
    this.animationFrame = requestAnimationFrame(loop);
  };
  
  this.animationFrame = requestAnimationFrame(loop);
}

Интеграция с WebSocket:

javascript// В crash-websocket.js уже есть подключение
// Нужно добавить обработчики событий:

socket.on('multiplier_update', (data) => {
  crashGraph.updateMultiplier(data.multiplier);
});

socket.on('crash', (data) => {
  crashGraph.triggerCrash();
});
🎨 Визуальный стиль (из crash-graph.css):

Цвет стрелки: #00ff88 (зеленый неон)
Цвет крэша: #ff3366 (красный)
Фон canvas: темный градиент
Шрифт коэффициента: 'Orbitron', monospace (футуристичный)

⚡ Производительность:

Не создавать новые объекты в каждом кадре
Переиспользовать переменные для позиций
Очищать canvas правильно: ctx.clearRect(0, 0, width, height)
Отключать анимацию при неактивной вкладке


ФОРМАТ РЕЗУЛЬТАТА
Структура файла crash-graph-animation.js:
javascript/**
 * Crash Game - Animation Engine
 * Управляет Canvas-анимацией стрелки и графика
 */

class CrashGraph {
  constructor(canvasId, options = {}) {
    // Инициализация...
  }
  
  // === ОСНОВНЫЕ МЕТОДЫ ===
  init() { }
  resizeCanvas() { }
  startAnimation() { }
  stopAnimation() { }
  
  // === ОБНОВЛЕНИЕ СОСТОЯНИЯ ===
  update(deltaTime) { }
  updateMultiplier(newValue) { }
  
  // === ОТРИСОВКА ===
  draw() { }
  drawBackground() { }
  drawGrid() { }
  drawTrajectory() { }
  drawArrow() { }
  drawMultiplier() { }
  
  // === АНИМАЦИИ ===
  animateMultiplier(target, duration) { }
  triggerCrash() { }
  reset() { }
  
  // === УТИЛИТЫ ===
  calculateArrowPosition(multiplier, time) { }
  easeOutQuad(t) { }
  easeInCubic(t) { }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function formatMultiplier(value) {
  return value.toFixed(2) + 'x';
}

function randomCrashPoint() {
  // Генерация случайного коэффициента краша
  // Экспоненциальное распределение для реалистичности
  const random = Math.random();
  return 1 + (-Math.log(random) / 0.5);
}

// === ЭКСПОРТ ===
export default CrashGraph;
Пример использования в crash-graph-demo.html:
javascript// Инициализация
const crashGraph = new CrashGraph('crashCanvas', {
  arrowColor: '#00ff88',
  crashColor: '#ff3366',
  gridLines: true
});

// Подключение к WebSocket
import './crash-websocket.js';

// Обработка событий
socket.on('game_start', () => {
  crashGraph.reset();
});

socket.on('multiplier_update', (data) => {
  crashGraph.updateMultiplier(data.multiplier);
});

socket.on('crash', (data) => {
  crashGraph.triggerCrash();
});

ПРИМЕРЫ КОДА
Пример 1: Траектория с кривыми Безье
javascriptcalculateArrowPosition(multiplier, time) {
  const height = this.canvas.height;
  const width = this.canvas.width;
  
  // Прогресс от 0 до 1
  const t = Math.min((multiplier - 1.0) / 9.0, 1);
  
  // Кривая Безье (квадратичная)
  const startY = height * 0.85;
  const controlY = height * 0.4;
  const endY = height * 0.1;
  
  const y = Math.pow(1-t, 2) * startY + 
            2 * (1-t) * t * controlY + 
            Math.pow(t, 2) * endY;
  
  // Небольшие колебания для живости
  const wobble = Math.sin(time * 0.003) * 25 * (1 - t);
  const x = width * 0.35 + wobble;
  
  // Угол наклона стрелки
  const dx = wobble;
  const dy = -50 * t;
  const angle = Math.atan2(dy, dx);
  
  return { x, y, angle };
}
Пример 2: Эффект свечения за стрелкой (trail)
javascriptdrawArrow() {
  const ctx = this.ctx;
  
  // История позиций для trail
  this.arrowTrail.push({ 
    x: this.arrow.x, 
    y: this.arrow.y,
    time: performance.now()
  });
  
  // Удаление старых точек (старше 500мс)
  const now = performance.now();
  this.arrowTrail = this.arrowTrail.filter(p => now - p.time < 500);
  
  // Отрисовка trail
  ctx.globalAlpha = 0.3;
  this.arrowTrail.forEach((point, index) => {
    const age = (now - point.time) / 500;
    const opacity = 1 - age;
    const size = 5 * opacity;
    
    ctx.fillStyle = '#00ff88';
    ctx.globalAlpha = opacity * 0.3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.globalAlpha = 1;
  
  // Основная стрелка (код из предыдущего примера)
  // ...
}
Пример 3: Плавный крэш с вращением
javascripttriggerCrash() {
  this.crashed = true;
  
  const crashConfig = {
    startX: this.arrow.x,
    startY: this.arrow.y,
    startAngle: this.arrow.angle,
    startTime: performance.now(),
    duration: 1000,
    acceleration: 2.5
  };
  
  const animateCrash = (currentTime) => {
    const elapsed = currentTime - crashConfig.startTime;
    const progress = Math.min(elapsed / crashConfig.duration, 1);
    
    // Ускоренное движение вверх
    const eased = this.easeInCubic(progress);
    this.arrow.y = crashConfig.startY - eased * this.canvas.height * 1.5;
    
    // Вращение
    this.arrow.angle = crashConfig.startAngle + progress * Math.PI * 4;
    
    // Исчезание
    this.arrow.opacity = 1 - progress;
    
    // Цвет меняется на красный
    const green = Math.floor((1 - progress) * 255);
    const red = 255;
    this.arrow.color = `rgb(${red}, ${green}, 136)`;
    
    if (progress < 1) {
      this.draw();
      requestAnimationFrame(animateCrash);
    } else {
      this.onCrashComplete();
    }
  };
  
  requestAnimationFrame(animateCrash);
}

easeInCubic(t) {
  return t * t * t;
}

ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМ КОДОМ
1. Подключение в HTML (crash-graph-demo.html):
html<canvas id="crashCanvas"></canvas>
<div class="multiplier-display">1.00x</div>

<script type="module">
  import CrashGraph from './crash-graph-animation.js';
  
  const graph = new CrashGraph('crashCanvas');
  window.crashGraph = graph; // Для доступа из других скриптов
</script>
2. Связь с WebSocket (crash-websocket.js):
javascript// Добавить в существующий crash-websocket.js:

socket.on('game_tick', (data) => {
  if (window.crashGraph) {
    window.crashGraph.updateMultiplier(data.currentMultiplier);
  }
});

socket.on('game_crash', (data) => {
  if (window.crashGraph) {
    window.crashGraph.triggerCrash();
    
    // Показать финальный множитель
    setTimeout(() => {
      alert(`Crashed at ${data.crashPoint.toFixed(2)}x!`);
    }, 1000);
  }
});
3. Настройка стилей (crash-graph.css):
css#crashCanvas {
  width: 100%;
  height: 400px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.multiplier-display {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Orbitron', monospace;
  font-size: 48px;
  font-weight: bold;
  color: #00ff88;
  text-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
  pointer-events: none;
}

ДОПОЛНИТЕЛЬНЫЕ ФИЧИ (ОПЦИОНАЛЬНО)
🌟 Уровень 1 - Базовый (обязательно):

✅ Плавная анимация стрелки
✅ Обновление коэффициента в реальном времени
✅ Эффект крэша

🌟 Уровень 2 - Продвинутый:

🎨 След за стрелкой (trail effect)
📊 Сетка на фоне с делениями
🎯 Маркеры для круглых значений (2x, 5x, 10x)

🌟 Уровень 3 - Премиум:

⚡ Частицы при крэше
🌈 Градиентная заливка траектории
📈 История предыдущих игр (мини-график)


НАЧНИ РАЗРАБОТКУ
Создай файл crash-graph-animation.js с:

✅ Базовым классом CrashGraph
✅ Методами для анимации стрелки
✅ Плавным обновлением коэффициента
✅ Эффектом крэша
✅ Комментариями на русском

Приоритет: сначала рабочая стрелка, потом визуальные эффекты!