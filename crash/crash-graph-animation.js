/**
 * Crash Game Graph Animation - Optimized for 60 FPS
 * Features: Exponential growth, smooth curves, glow effects, particles, trail
 */

class CrashGraphAnimation {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }
    
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.setupCanvas();
    
    // Configuration
    this.config = {
      baseGrowth: options.baseGrowth || 0.0001,
      maxPoints: options.maxPoints || 120,
      trailLength: options.trailLength || 8,
      particleCount: options.particleCount || 30,
      growColor: options.growColor || '#00ff88',
      crashColor: options.crashColor || '#ff3366',
      glowSize: options.glowSize || 20,
      lineWidth: options.lineWidth || 3,
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
    this.currentMultiplier = 1.00;
    this.crashMultiplier = null;
    
    // Graph bounds
    this.padding = { top: 30, right: 30, bottom: 40, left: 50 };
    this.graphWidth = this.canvas.width - this.padding.left - this.padding.right;
    this.graphHeight = this.canvas.height - this.padding.top - this.padding.bottom;
    
    // Bind methods
    this.animate = this.animate.bind(this);
  }
  
  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isCrashed = false;
    this.startTime = Date.now();
    this.crashTime = null;
    this.points = [];
    this.particles = [];
    this.currentMultiplier = 1.00;
    this.crashMultiplier = null;
    
    this.animate();
  }
  
  crash(multiplier) {
    if (this.isCrashed) return;
    
    this.isCrashed = true;
    this.crashTime = Date.now();
    this.crashMultiplier = multiplier || this.currentMultiplier;
    
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
    this.currentMultiplier = 1.00;
    this.isCrashed = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  calculateMultiplier(elapsed) {
    return Math.pow(1 + this.config.baseGrowth, elapsed);
  }
  
  animate() {
    if (!this.isRunning && !this.isCrashed) return;
    
    const now = Date.now();
    const elapsed = now - this.startTime;
    
    if (!this.isCrashed) {
      this.currentMultiplier = this.calculateMultiplier(elapsed);
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
      this.animateCrash(now - this.crashTime);
      this.updateParticles();
      this.drawParticles();
    }
    
    this.animationFrame = requestAnimationFrame(this.animate);
  }
  
  updatePoints(elapsed) {
    const x = this.mapTime(elapsed);
    const y = this.mapMultiplier(this.currentMultiplier);
    
    if (this.points.length === 0 || x > this.points[this.points.length - 1].x + 2) {
      this.points.push({ x, y, multiplier: this.currentMultiplier, time: elapsed });
    }
    
    // Optimize: remove points outside viewport
    const minX = this.padding.left - 50;
    this.points = this.points.filter(p => p.x >= minX);
    
    // Limit max points
    if (this.points.length > this.config.maxPoints) {
      this.points = this.points.slice(-this.config.maxPoints);
    }
  }
  
  drawGrid() {
    const ctx = this.ctx;
    const { left, top } = this.padding;
    const width = this.graphWidth;
    const height = this.graphHeight;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let i = 0; i <= 5; i++) {
      const y = top + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();
    }
    
    // Vertical lines
    for (let i = 0; i <= 5; i++) {
      const x = left + (width / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, width, height);
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
    
    // Bezier curve interpolation for smoothness
    for (let i = 0; i < this.points.length - 1; i++) {
      const current = this.points[i];
      const next = this.points[i + 1];
      
      if (i === this.points.length - 2) {
        ctx.lineTo(next.x, next.y);
      } else {
        const nextNext = this.points[i + 2];
        const cpX = next.x;
        const cpY = next.y;
        ctx.quadraticCurveTo(cpX, cpY, (next.x + nextNext.x) / 2, (next.y + nextNext.y) / 2);
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
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, this.points[0].y, 0, bottomY);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, bottomY);
    
    // Draw curve path
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
        const cpX = next.x;
        const cpY = next.y;
        ctx.quadraticCurveTo(cpX, cpY, (next.x + nextNext.x) / 2, (next.y + nextNext.y) / 2);
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
    
    // Outer glow
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
    
    // Center point with pulse
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
      
      ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
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
    
    const x = this.canvas.width / 2;
    const y = this.padding.top + 20;
    
    // Shadow
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
    this.particles = this.particles.filter(p => p.life > 0);
    
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.life -= p.decay;
      p.vx *= 0.98;
      p.vy *= 0.98;
    });
  }
  
  drawParticles() {
    const ctx = this.ctx;
    
    this.particles.forEach(p => {
      const alpha = Math.floor(p.life * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = `${this.config.crashColor}${alpha}`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  animateCrash(elapsed) {
    if (!this.crashMultiplier || elapsed > 1000) return;
    
    const progress = elapsed / 1000;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    // Animate line falling down
    const fallDistance = this.graphHeight * 0.3;
    const fallOffset = easeOut * fallDistance;
    
    this.points = this.points.map(point => ({
      ...point,
      y: point.y + fallOffset * (1 - (point.x - this.padding.left) / this.graphWidth)
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
    return this.padding.top + this.graphHeight - (normalizedMultiplier * this.graphHeight);
  }
  
  // Easing functions
  static easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// Auto-init if canvas exists
if (typeof window !== 'undefined') {
  window.CrashGraphAnimation = CrashGraphAnimation;
  
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('crashGraph');
    if (canvas && !window.crashGraphInstance) {
      window.crashGraphInstance = new CrashGraphAnimation('crashGraph', {
        baseGrowth: 0.0001,
        maxPoints: 120,
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
