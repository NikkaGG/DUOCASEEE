/**
 * Crash Game - Animation Engine
 * Управляет Canvas-анимацией стрелки и графика
 * 
 * @author Telegram Mini App Team
 * @version 2.0
 */

class CrashGraph {
  constructor(canvasId, options = {}) {
    // Инициализация Canvas
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas с id "${canvasId}" не найден`);
    }
    
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    
    // Конфигурация
    this.config = {
      arrowColor: options.arrowColor || '#00ff88',
      crashColor: options.crashColor || '#ff3366',
      gridLines: options.gridLines !== false,
      backgroundColor: options.backgroundColor || '#1a1a2e',
      trailLength: options.trailLength || 15,
      maxMultiplier: options.maxMultiplier || 10,
      animationSpeed: options.animationSpeed || 1
    };
    
    // Состояние игры
    this.multiplier = 1.00;
    this.targetMultiplier = 1.00;
    this.crashed = false;
    this.running = false;
    this.startTime = null;
    this.animationFrame = null;
    
    // Стрелка
    this.arrow = {
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      opacity: 1,
      color: this.config.arrowColor
    };
    
    // История позиций для trail эффекта
    this.arrowTrail = [];
    
    // Частицы для эффекта крэша
    this.particles = [];
    
    // Инициализация
    this.init();
  }
  
  // === ОСНОВНЫЕ МЕТОДЫ ===
  
  /**
   * Инициализация графика
   */
  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Начальная позиция стрелки
    this.arrow.x = this.canvas.width * 0.1;
    this.arrow.y = this.canvas.height * 0.8;
  }
  
  /**
   * Адаптация Canvas под размер контейнера (Retina-ready)
   */
  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Пересчитываем позицию стрелки при изменении размера
    if (this.running) {
      const pos = this.calculateArrowPosition(this.multiplier, performance.now());
      this.arrow.x = pos.x;
      this.arrow.y = pos.y;
      this.arrow.angle = pos.angle;
    }
  }
  
  /**
   * Запуск анимационного цикла
   */
  startAnimation() {
    if (this.running) return;
    
    this.running = true;
    this.crashed = false;
    this.multiplier = 1.00;
    this.targetMultiplier = 1.00;
    this.startTime = performance.now();
    this.arrowTrail = [];
    this.particles = [];
    this.arrow.opacity = 1;
    this.arrow.color = this.config.arrowColor;
    
    let lastTime = performance.now();
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;
    
    const loop = (currentTime) => {
      if (!this.running && !this.crashed) return;
      
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
  
  /**
   * Остановка анимации
   */
  stopAnimation() {
    this.running = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  // === ОБНОВЛЕНИЕ СОСТОЯНИЯ ===
  
  /**
   * Обновление состояния анимации
   */
  update(deltaTime) {
    if (!this.crashed) {
      // Плавное приближение к целевому коэффициенту
      const delta = this.targetMultiplier - this.multiplier;
      if (Math.abs(delta) > 0.001) {
        this.multiplier += delta * 0.15; // Плавность интерполяции
      } else {
        this.multiplier = this.targetMultiplier;
      }
      
      // Обновление позиции стрелки
      const pos = this.calculateArrowPosition(this.multiplier, performance.now());
      this.arrow.x = pos.x;
      this.arrow.y = pos.y;
      this.arrow.angle = pos.angle;
      this.arrow.speed = (this.multiplier - 1.0) * 2;
    }
    
    // Обновление частиц
    this.updateParticles(deltaTime);
  }
  
  /**
   * Обновление коэффициента (вызывается извне, например из WebSocket)
   */
  updateMultiplier(newValue) {
    if (this.crashed) return;
    this.targetMultiplier = Math.max(newValue, 1.00);
  }
  
  /**
   * Плавная анимация коэффициента с easing
   */
  animateMultiplier(targetValue, duration = 100) {
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
  
  /**
   * Обновление отображения коэффициента в DOM
   */
  updateMultiplierDisplay() {
    const display = document.querySelector('.multiplier-display');
    if (display) {
      display.textContent = formatMultiplier(this.multiplier);
      display.style.color = this.crashed ? this.config.crashColor : this.config.arrowColor;
    }
  }
  
  // === ОТРИСОВКА ===
  
  /**
   * Главный метод отрисовки
   */
  draw() {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Очистка canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Отрисовка слоев
    this.drawBackground(width, height);
    
    if (this.config.gridLines) {
      this.drawGrid(width, height);
    }
    
    this.drawTrajectory();
    this.drawTrail();
    this.drawArrow();
    this.drawParticles();
    this.drawMultiplier(width, height);
  }
  
  /**
   * Отрисовка фона
   */
  drawBackground(width, height) {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }
  
  /**
   * Отрисовка сетки
   */
  drawGrid(width, height) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Вертикальные линии
    const verticalLines = 10;
    for (let i = 0; i <= verticalLines; i++) {
      const x = (width / verticalLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Горизонтальные линии
    const horizontalLines = 8;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = (height / horizontalLines) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Маркеры для круглых значений (2x, 5x, 10x)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    
    const markers = [2, 5, 10];
    markers.forEach(mult => {
      const progress = (mult - 1.0) / (this.config.maxMultiplier - 1.0);
      const y = height * 0.85 - progress * height * 0.75;
      
      if (y > 20 && y < height - 20) {
        ctx.fillText(`${mult}x`, width - 10, y + 4);
        
        // Пунктирная линия
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }
  
  /**
   * Отрисовка траектории (заливка под кривой)
   */
  drawTrajectory() {
    if (this.arrowTrail.length < 2) return;
    
    const ctx = this.ctx;
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const color = this.crashed ? this.config.crashColor : this.config.arrowColor;
    
    // Градиентная заливка
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    // Начинаем снизу
    ctx.moveTo(this.arrowTrail[0].x, height * 0.85);
    
    // Рисуем по точкам trail
    this.arrowTrail.forEach((point, index) => {
      if (index === 0) {
        ctx.lineTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    
    // Замыкаем к низу
    ctx.lineTo(this.arrow.x, height * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  
  /**
   * Отрисовка следа за стрелкой (trail effect)
   */
  drawTrail() {
    const ctx = this.ctx;
    const now = performance.now();
    
    // История позиций для trail
    this.arrowTrail.push({ 
      x: this.arrow.x, 
      y: this.arrow.y,
      time: now
    });
    
    // Удаление старых точек (старше 500мс)
    this.arrowTrail = this.arrowTrail.filter(p => now - p.time < 500);
    
    // Ограничение количества точек
    if (this.arrowTrail.length > this.config.trailLength) {
      this.arrowTrail = this.arrowTrail.slice(-this.config.trailLength);
    }
    
    // Отрисовка trail
    this.arrowTrail.forEach((point, index) => {
      const age = (now - point.time) / 500;
      const opacity = 1 - age;
      const size = 5 * opacity;
      
      ctx.fillStyle = this.arrow.color;
      ctx.globalAlpha = opacity * 0.3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  }
  
  /**
   * Отрисовка стрелки
   */
  drawArrow() {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalAlpha = this.arrow.opacity;
    ctx.translate(this.arrow.x, this.arrow.y);
    ctx.rotate(this.arrow.angle);
    
    // Свечение
    ctx.shadowColor = this.arrow.color;
    ctx.shadowBlur = 20;
    
    // Тело стрелки (треугольник)
    ctx.fillStyle = this.arrow.color;
    ctx.beginPath();
    ctx.moveTo(0, -30); // Наконечник
    ctx.lineTo(-10, 10);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.fill();
    
    // Хвост стрелки (линия)
    ctx.strokeStyle = this.arrow.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, 40);
    ctx.stroke();
    
    // Дополнительное свечение в центре
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
    glowGradient.addColorStop(0, `${this.arrow.color}60`);
    glowGradient.addColorStop(1, `${this.arrow.color}00`);
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Отрисовка коэффициента на canvas
   */
  drawMultiplier(width, height) {
    const ctx = this.ctx;
    const multiplierText = formatMultiplier(this.multiplier);
    const color = this.crashed ? this.config.crashColor : this.config.arrowColor;
    
    ctx.font = 'bold 48px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = width / 2;
    const y = 40;
    
    // Свечение текста
    ctx.shadowBlur = 25;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillText(multiplierText, x, y);
    
    // Повторная отрисовка без тени для яркости
    ctx.shadowBlur = 0;
    ctx.fillText(multiplierText, x, y);
  }
  
  // === АНИМАЦИИ ===
  
  /**
   * Эффект крэша с улетом стрелки
   */
  triggerCrash() {
    if (this.crashed) return;
    
    this.crashed = true;
    this.running = false;
    
    const crashConfig = {
      startX: this.arrow.x,
      startY: this.arrow.y,
      startAngle: this.arrow.angle,
      startTime: performance.now(),
      duration: 1000,
      acceleration: 2.5
    };
    
    // Создаем частицы взрыва
    this.createParticleExplosion();
    
    const animateCrash = (currentTime) => {
      const elapsed = currentTime - crashConfig.startTime;
      const progress = Math.min(elapsed / crashConfig.duration, 1);
      
      // Ускоренное движение вверх
      const eased = this.easeInCubic(progress);
      const height = this.canvas.height / (window.devicePixelRatio || 1);
      this.arrow.y = crashConfig.startY - eased * height * 1.5;
      
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
  
  /**
   * Завершение анимации крэша
   */
  onCrashComplete() {
    this.updateMultiplierDisplay();
    
    // Можно добавить callback для внешнего кода
    if (typeof this.config.onCrashComplete === 'function') {
      this.config.onCrashComplete(this.multiplier);
    }
  }
  
  /**
   * Сброс графика к начальному состоянию
   */
  reset() {
    this.stopAnimation();
    this.multiplier = 1.00;
    this.targetMultiplier = 1.00;
    this.crashed = false;
    this.running = false;
    this.arrowTrail = [];
    this.particles = [];
    this.arrow.opacity = 1;
    this.arrow.color = this.config.arrowColor;
    
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    this.arrow.x = width * 0.1;
    this.arrow.y = height * 0.8;
    this.arrow.angle = -Math.PI / 4;
    
    this.ctx.clearRect(0, 0, width, height);
    this.draw();
  }
  
  // === ЧАСТИЦЫ ===
  
  /**
   * Создание эффекта взрыва частиц
   */
  createParticleExplosion() {
    this.particles = [];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 2 + Math.random() * 4;
      
      this.particles.push({
        x: this.arrow.x,
        y: this.arrow.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1.0,
        size: 2 + Math.random() * 4,
        decay: 0.015 + Math.random() * 0.01,
        color: this.config.crashColor
      });
    }
  }
  
  /**
   * Обновление частиц
   */
  updateParticles(deltaTime) {
    this.particles = this.particles.filter(p => p.life > 0);
    
    this.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2; // Гравитация
      particle.life -= particle.decay;
      particle.vx *= 0.98; // Сопротивление воздуха
      particle.vy *= 0.98;
    });
  }
  
  /**
   * Отрисовка частиц
   */
  drawParticles() {
    const ctx = this.ctx;
    
    this.particles.forEach(particle => {
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  }
  
  // === УТИЛИТЫ ===
  
  /**
   * Расчет позиции стрелки на траектории
   * Использует комбинацию кривых Безье и синусоиды
   */
  calculateArrowPosition(multiplier, time) {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Прогресс от 0 до 1
    const t = Math.min((multiplier - 1.0) / (this.config.maxMultiplier - 1.0), 1);
    
    // Кривая Безье (квадратичная) для Y
    const startY = height * 0.85;
    const controlY = height * 0.4;
    const endY = height * 0.1;
    
    const y = Math.pow(1 - t, 2) * startY + 
              2 * (1 - t) * t * controlY + 
              Math.pow(t, 2) * endY;
    
    // Небольшие колебания для "живости"
    const wobble = Math.sin(time * 0.003) * 25 * (1 - t);
    const x = width * 0.35 + wobble + t * width * 0.3;
    
    // Угол наклона стрелки (по направлению движения)
    const dx = wobble;
    const dy = -50 * t;
    const angle = Math.atan2(dy, dx) - Math.PI / 2;
    
    return { x, y, angle };
  }
  
  /**
   * Easing функция - плавное замедление
   */
  easeOutQuad(t) {
    return t * (2 - t);
  }
  
  /**
   * Easing функция - плавное ускорение
   */
  easeInCubic(t) {
    return t * t * t;
  }
  
  /**
   * Easing функция - плавное ускорение и замедление
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

/**
 * Форматирование коэффициента для отображения
 */
function formatMultiplier(value) {
  return value.toFixed(2) + 'x';
}

/**
 * Генерация случайного коэффициента краша
 * Использует экспоненциальное распределение для реалистичности
 */
function randomCrashPoint() {
  const random = Math.random();
  return 1 + (-Math.log(random) / 0.5);
}

// === ЭКСПОРТ ===

// Экспорт для ES6 модулей
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CrashGraph;
}

// Глобальный доступ в браузере
if (typeof window !== 'undefined') {
  window.CrashGraph = CrashGraph;
  window.formatMultiplier = formatMultiplier;
  window.randomCrashPoint = randomCrashPoint;
}
