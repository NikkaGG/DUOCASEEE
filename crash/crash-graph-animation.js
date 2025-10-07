/**
 * Crash Game Graph Animation - Optimized for 60 FPS
 * Supports external multiplier streams (e.g. WebSocket) and smooth canvas resizing
 */

class CrashGraphAnimation {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    this.config = {
      baseGrowth: options.baseGrowth ?? 0.0001,
      maxPoints: options.maxPoints ?? 500,
      trailLength: options.trailLength ?? 8,
      particleCount: options.particleCount ?? 30,
      growColor: options.growColor ?? '#00ff88',
      crashColor: options.crashColor ?? '#ff3366',
      glowSize: options.glowSize ?? 20,
      lineWidth: options.lineWidth ?? 3,
      externalSmoothing: options.externalSmoothing ?? 0.18,
      useExternalMultiplier: Boolean(options.useExternalMultiplier),
      ...options
    };

    // State
    this.isRunning = false;
    this.isCrashed = false;
    this.startTime = null;
    this.crashTime = null;
    this.animationFrame = null;
    this.points = [];
    this.particles = [];
    this.currentMultiplier = 1.0;
    this.crashMultiplier = null;
    this.targetMultiplier = this.config.useExternalMultiplier ? 1.0 : null;
    this.multiplierSmoothing = Math.min(Math.max(this.config.externalSmoothing, 0.01), 1);
    this.lastResizeTS = 0;

    // Geometry helpers
    this.padding = { top: 30, right: 30, bottom: 40, left: 30 };
    this.graphWidth = 0;
    this.graphHeight = 0;
    this.displayWidth = 0;
    this.displayHeight = 0;

    // Resize observers
    this.resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.setupCanvas());
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener('resize', this.handleResize);
    }

    this.setupCanvas();
  }

  setupCanvas() {
    const now = Date.now();
    if (now - this.lastResizeTS < 16) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const parent = this.canvas.parentElement;
    const fallbackWidth = parent ? parent.clientWidth : this.canvas.width;
    const fallbackHeight = parent ? parent.clientHeight : this.canvas.height;

    const displayWidth = Math.max(rect.width || fallbackWidth || 600, 1);
    const displayHeight = Math.max(rect.height || fallbackHeight || 400, 1);

    const prevGraphWidth = this.graphWidth || (displayWidth - this.padding.left - this.padding.right);
    const prevGraphHeight = this.graphHeight || (displayHeight - this.padding.top - this.padding.bottom);

    const bufferWidth = Math.round(displayWidth * dpr);
    const bufferHeight = Math.round(displayHeight * dpr);

    if (this.canvas.width !== bufferWidth || this.canvas.height !== bufferHeight) {
      this.canvas.width = bufferWidth;
      this.canvas.height = bufferHeight;
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    this.graphWidth = Math.max(displayWidth - this.padding.left - this.padding.right, 10);
    this.graphHeight = Math.max(displayHeight - this.padding.top - this.padding.bottom, 10);
    this.displayWidth = displayWidth;
    this.displayHeight = displayHeight;

    if (this.points.length && prevGraphWidth > 0 && prevGraphHeight > 0) {
      const scaleX = this.graphWidth / prevGraphWidth;
      const scaleY = this.graphHeight / prevGraphHeight;
      this.points = this.points.map(point => ({
        ...point,
        x: this.padding.left + (point.x - this.padding.left) * scaleX,
        y: this.padding.top + (point.y - this.padding.top) * scaleY
      }));
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.lastResizeTS = now;
  }

  start(startTimestamp) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isCrashed = false;
    this.startTime = Number.isFinite(startTimestamp) ? startTimestamp : Date.now();
    this.crashTime = null;
    this.points = [];
    this.particles = [];
    this.currentMultiplier = 1.0;
    this.crashMultiplier = null;
    if (this.config.useExternalMultiplier) {
      this.targetMultiplier = 1.0;
    }

    this.setupCanvas();
    
    // Добавляем начальную точку в левом нижнем углу
    const startX = this.padding.left;
    const startY = this.padding.top + this.graphHeight;
    this.points.push({ x: startX, y: startY, multiplier: 1.0, time: 0 });
    
    this.animate();
  }

  crash(multiplier) {
    if (this.isCrashed) return;

    this.isCrashed = true;
    this.crashTime = Date.now();
    const crashValue = Number.isFinite(multiplier) ? multiplier : this.currentMultiplier;
    this.crashMultiplier = crashValue;

    if (this.config.useExternalMultiplier) {
      this.setExternalMultiplier(crashValue, { immediate: true });
    }

    this.createParticleExplosion();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  reset() {
    this.stop();
    this.points = [];
    this.particles = [];
    this.currentMultiplier = 1.0;
    this.crashMultiplier = null;
    this.isCrashed = false;
    if (this.config.useExternalMultiplier) {
      this.targetMultiplier = 1.0;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  calculateMultiplier(elapsed) {
    return Math.pow(1 + this.config.baseGrowth, elapsed);
  }

  animate() {
    if (!this.isRunning && !this.isCrashed) return;

    const now = Date.now();
    const elapsed = this.startTime ? now - this.startTime : 0;

    if (!this.isCrashed) {
      if (this.config.useExternalMultiplier && this.targetMultiplier !== null) {
        const delta = this.targetMultiplier - this.currentMultiplier;
        if (Math.abs(delta) > 1e-4) {
          this.currentMultiplier += delta * this.multiplierSmoothing;
        } else {
          this.currentMultiplier = this.targetMultiplier;
        }
      } else {
        this.currentMultiplier = this.calculateMultiplier(elapsed);
      }
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.updatePoints(elapsed);
    this.drawGradientFill();
    this.drawCurve();
    this.drawGlowPoint();
    this.drawTrail();
    this.drawMultiplierText();

    if (this.isCrashed) {
      const crashElapsed = this.crashTime ? now - this.crashTime : 0;
      this.animateCrash(crashElapsed);
      this.updateParticles();
      this.drawParticles();
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  }

  updatePoints(elapsed) {
    const x = this.mapMultiplier(this.currentMultiplier);
    const y = this.mapMultiplierVertical(this.currentMultiplier);

    // Добавляем точку при каждом кадре для плавности
    if (this.points.length === 0) {
      this.points.push({ x, y, multiplier: this.currentMultiplier, time: elapsed });
    } else {
      const lastPoint = this.points[this.points.length - 1];
      // Добавляем точку если коэффициент изменился достаточно
      if (this.currentMultiplier > lastPoint.multiplier + 0.005) {
        this.points.push({ x, y, multiplier: this.currentMultiplier, time: elapsed });
      } else {
        // Обновляем последнюю точку для плавности
        lastPoint.x = x;
        lastPoint.y = y;
        lastPoint.multiplier = this.currentMultiplier;
        lastPoint.time = elapsed;
      }
    }

    if (this.points.length > this.config.maxPoints) {
      this.points = this.points.slice(-this.config.maxPoints);
    }
  }

  drawGrid() {
    // Grid rendering disabled
  }

  drawCurve() {
    if (this.points.length < 2) return;

    const ctx = this.ctx;
    const color = this.isCrashed ? this.config.crashColor : this.config.growColor;

    ctx.strokeStyle = color;
    ctx.lineWidth = this.config.lineWidth;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 0; i < this.points.length - 1; i++) {
      const current = this.points[i];
      const next = this.points[i + 1];

      if (i === this.points.length - 2) {
        ctx.lineTo(next.x, next.y);
      } else {
        const nextNext = this.points[i + 2];
        ctx.quadraticCurveTo(next.x, next.y, (next.x + nextNext.x) / 2, (next.y + nextNext.y) / 2);
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawGradientFill() {
    if (this.points.length < 2) return;

    const ctx = this.ctx;
    const color = this.isCrashed ? this.config.crashColor : this.config.growColor;
    const bottomY = this.padding.top + this.graphHeight;

    const gradient = ctx.createLinearGradient(0, this.points[0].y, 0, bottomY);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, bottomY);

    for (let i = 0; i < this.points.length - 1; i++) {
      const current = this.points[i];
      const next = this.points[i + 1];

      if (i === 0) {
        ctx.lineTo(current.x, current.y);
      }

      if (i === this.points.length - 2) {
        ctx.lineTo(next.x, next.y);
      } else {
        const nextNext = this.points[i + 2];
        ctx.quadraticCurveTo(next.x, next.y, (next.x + nextNext.x) / 2, (next.y + nextNext.y) / 2);
      }
    }

    const lastPoint = this.points[this.points.length - 1];
    ctx.lineTo(lastPoint.x, bottomY);
    ctx.closePath();
    ctx.fill();
  }

  drawGlowPoint() {
    if (this.points.length === 0) return;

    const lastPoint = this.points[this.points.length - 1];
    const ctx = this.ctx;
    const color = this.isCrashed ? this.config.crashColor : this.config.growColor;

    const glowGradient = ctx.createRadialGradient(
      lastPoint.x, lastPoint.y, 0,
      lastPoint.x, lastPoint.y, this.config.glowSize
    );
    glowGradient.addColorStop(0, `${color}80`);
    glowGradient.addColorStop(0.5, `${color}40`);
    glowGradient.addColorStop(1, `${color}00`);

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, this.config.glowSize, 0, Math.PI * 2);
    ctx.fill();

    const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 4 * pulseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawTrail() {
    if (this.points.length < 2) return;

    const ctx = this.ctx;
    const color = this.isCrashed ? this.config.crashColor : this.config.growColor;
    const trailPoints = this.points.slice(-this.config.trailLength);

    for (let i = 0; i < trailPoints.length - 1; i++) {
      const point = trailPoints[i];
      const alpha = (i / trailPoints.length) * 0.5;
      const size = (i / trailPoints.length) * 3 + 1;
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

      ctx.fillStyle = `${color}${alphaHex}`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMultiplierText() {
    const ctx = this.ctx;
    const multiplierText = `${this.currentMultiplier.toFixed(2)}x`;
    const color = this.isCrashed ? this.config.crashColor : this.config.growColor;

    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = this.displayWidth / 2;
    const y = this.padding.top + 20;

    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillText(multiplierText, x, y);
    ctx.shadowBlur = 0;
  }

  createParticleExplosion() {
    if (this.points.length === 0) return;

    const lastPoint = this.points[this.points.length - 1];
    this.particles = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / this.config.particleCount;
      const velocity = 2 + Math.random() * 3;

      this.particles.push({
        x: lastPoint.x,
        y: lastPoint.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1.0,
        size: 2 + Math.random() * 3,
        decay: 0.015 + Math.random() * 0.01
      });
    }
  }

  updateParticles() {
    this.particles = this.particles.filter(particle => particle.life > 0);

    this.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.15;
      particle.life -= particle.decay;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    });
  }

  drawParticles() {
    const ctx = this.ctx;

    this.particles.forEach(particle => {
      const alphaHex = Math.round(particle.life * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = `${this.config.crashColor}${alphaHex}`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  animateCrash(elapsed) {
    if (!this.crashMultiplier || elapsed > 1000) return;

    const progress = elapsed / 1000;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const fallDistance = this.graphHeight * 0.5;
    const fallOffset = easeOut * fallDistance;

    const bottomY = this.padding.top + this.graphHeight;
    this.points = this.points.map((point, index) => ({
      ...point,
      y: Math.min(point.y + fallOffset * (index / this.points.length), bottomY)
    }));
  }

  mapTime(time) {
    const maxTime = 30000;
    const normalizedTime = Math.min(time / maxTime, 1);
    return this.padding.left + normalizedTime * this.graphWidth;
  }

  mapMultiplier(multiplier) {
    const maxMultiplier = 10;
    const normalizedMultiplier = Math.min((multiplier - 1) / (maxMultiplier - 1), 1);
    return this.padding.left + normalizedMultiplier * this.graphWidth;
  }

  mapMultiplierVertical(multiplier) {
    const maxMultiplier = 10;
    const normalizedMultiplier = Math.min((multiplier - 1) / (maxMultiplier - 1), 1);
    return this.padding.top + this.graphHeight - normalizedMultiplier * this.graphHeight;
  }

  setExternalMultiplier(multiplier, { immediate = false } = {}) {
    if (!this.config.useExternalMultiplier) return;
    if (!Number.isFinite(multiplier)) return;

    const clamped = Math.max(multiplier, 1.0);
    this.targetMultiplier = clamped;

    if (immediate) {
      this.currentMultiplier = clamped;
    }
  }

  syncStartTime(timestamp) {
    if (Number.isFinite(timestamp)) {
      this.startTime = timestamp;
    }
  }

  handleResize() {
    this.setupCanvas();
  }

  destroy() {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  // Easing utilities
  static easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

if (typeof window !== 'undefined') {
  window.CrashGraphAnimation = CrashGraphAnimation;

  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('crashGraph');
    if (canvas && !window.crashGraphInstance) {
      window.crashGraphInstance = new CrashGraphAnimation('crashGraph', {
        baseGrowth: 0.0001,
        maxPoints: 500,
        trailLength: 8,
        particleCount: 35,
        growColor: '#00ff88',
        crashColor: '#ff3366',
        glowSize: 20,
        lineWidth: 3
      });
    }
  });
}
