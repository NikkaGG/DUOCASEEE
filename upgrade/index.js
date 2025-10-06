// ==============================
// ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ UI
// ==============================
const buttons = document.querySelectorAll('.multiplier-button > div');
const betInputEl = document.querySelector('.element-5 .text-wrapper-18');
const betAmountViewEl = document.querySelector('.bet-amount-desired .frame-2 .info-amount .text-wrapper-8');
const desiredPrizeViewEl = document.querySelector('.bet-amount-desired .frame-3 .info-amount-2 .text-wrapper-8');
// Баланс теперь может быть в новой разметке (.balance-1) или старой (.balance ...)
const balanceMainEl = document.querySelector('.balance-1 .group-ico-1:nth-child(1) span')
                   || document.querySelector('.balance .element .text-wrapper-2');
const balanceSecondaryEl = document.querySelector('.balance-1 .group-ico-1:nth-child(2) span')
                        || document.querySelector('.balance .div-wrapper .text-wrapper-4');
const balanceTextEl = balanceMainEl; // для совместимости с существующим кодом
const applyBtn = document.querySelector('.apply-button');
const upgradeBtn = document.querySelector('.upgrade-button');
const chanceDisplay = document.querySelector('.chance .text-wrapper-10');
// Вращаем весь блок .arrow (а не картинку внутри)
const arrow = document.querySelector('.arrow');
// Индикатор процента позиции на колесе (существующий 0% в разметке)
const positionPercentEl = document.querySelector('.group-2 .text-wrapper-14');

// Функция чтения баланса через глобальный API
function getBalance() {
  return window.GameBalanceAPI ? window.GameBalanceAPI.getBalance('rubles') : 1000;
}

// Текущее состояние
let betAmount = 0; // применённая ставка (без множителя)
let multiplier = 1;
let currentRotation = 0; // накопительный угол для нормализации позиционирования стрелки
let betApplied = false; // флаг: ставка применена через Apply
let ringOffsetDeg = 0; // сдвиг выигрышной зоны по кругу (0..360), меняем после каждого спина
let isSpinning = false; // защита от повторных кликов во время прокрутки
let lastStopAngle = null; // последний нормализованный угол остановки стрелки [0..360)

// Разрешаем ввод ставки без изменения структуры — делаем contenteditable
if (betInputEl) {
  betInputEl.setAttribute('contenteditable', 'true');
  betInputEl.setAttribute('inputmode', 'decimal');
  // если в разметке оставили "0" — очищаем, чтобы работал плейсхолдер
  if (betInputEl.textContent.trim() === '0') betInputEl.textContent = '';
}

// Готовим .arrow к плавному вращению вокруг центра
if (arrow) {
  arrow.style.transformOrigin = '50% 50%';
  arrow.style.willChange = 'transform';
}

// Вставим стили плейсхолдера "0" и уберём системный бордер при фокусе
(function injectInlineStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .element-5 .text-wrapper-18 {
      min-width: 20px;
      outline: none;
      caret-color: #fff;
    }
    .element-5 .text-wrapper-18:empty:before {
      content: '0';
      color: #9aa0a6;
      opacity: .6;
    }
    .element-5 .text-wrapper-18:focus { outline: none; }
    /* Результат */
    .game.win .chance .p .text-wrapper-10 { color: #39ff95; }
    .game.lose .chance .p .text-wrapper-10 { color: #ff6767; }

    /* Малый хитбокс у кончика стрелки */
    .arrow .hitbox {
      position: absolute;
      left: 50%;
      top: 10px; /* на ободе колеса */
      transform: translateX(-50%);
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.001); /* почти невидимая точка */
      pointer-events: none;
    }

    /* Chance ring (win vs lose visualization) */
    .chance-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 86%;
      height: 86%;
      border-radius: 50%;
      pointer-events: none;
      opacity: .75;
      z-index: 3;
      /* вырезаем центр, чтобы получить тонкое кольцо */
      -webkit-mask: radial-gradient(circle, rgba(0,0,0,0) 70%, rgba(0,0,0,1) 71%);
              mask: radial-gradient(circle, rgba(0,0,0,0) 70%, rgba(0,0,0,1) 71%);
      box-shadow: inset 0 0 12px rgba(0,0,0,.35);
    }
    /* legend removed */

    /* Заблокированная кнопка Upgrade во время спина */
    .upgrade-button.disabled { opacity: .6; pointer-events: none; filter: grayscale(30%); }

    /* Увеличение ТОЛЬКО bg внутри блоков суммы при большой ставке */
    .info-amount .bg, .info-amount-2 .bg {
      transition: transform 200ms ease;
      will-change: transform;
    }
    .info-amount.is-large .bg, .info-amount-2.is-large .bg {
      transform: scale(1.08);
    }
  `;
  document.head.appendChild(style);
})();

// Небольшой кастомный серо-пепельный тост
function showToast(message) {
  let toast = document.querySelector('#upgrade-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'upgrade-toast';
    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      top: '10px',
      transform: 'translateX(-50%)',
      background: 'rgba(60,60,60,0.92)',
      color: '#e5e5e5',
      padding: '10px 14px',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      fontFamily: 'Montserrat, Inter, Arial, sans-serif',
      fontSize: '13px',
      letterSpacing: '0.2px',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity .2s ease'
    });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 1600);
  });
}

// Утилиты
const toNumber = (str) => {
  const n = parseFloat(String(str).replace(',', '.'));
  return isNaN(n) ? 0 : Math.max(0, n);
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Throttle expensive updates
let refreshThrottle = null;
function refreshSummaryViews(previewValue) {
  if (refreshThrottle) return;
  refreshThrottle = setTimeout(() => {
    refreshThrottle = null;
    _doRefreshSummaryViews(previewValue);
  }, 16); // ~60fps throttle
}

function _doRefreshSummaryViews(previewValue) {
  // previewValue — это значение в поле ввода (может быть >0 даже до apply)
  const shown = typeof previewValue === 'number' ? previewValue : toNumber(betInputEl?.textContent || '0');
  // Bet Amount (слева) — показываем 0.00, пока не Apply
  if (betAmountViewEl) {
    betAmountViewEl.textContent = betApplied ? betAmount.toFixed(2) : '0.00';
  }
  // Desired prize — ввод × активный множитель
  if (desiredPrizeViewEl) desiredPrizeViewEl.textContent = (shown * multiplier).toFixed(2);
  // Живой шанс в центре
  const liveBal = getBalance();
  const liveChance = calculateChance(shown, liveBal);
  if (chanceDisplay) chanceDisplay.textContent = Math.round(liveChance).toString();
  updateChanceRing(liveChance);
  // Визуальная реакция блоков сумм на размер ставки
  updateBetVisualIntensity(shown, liveBal);
}

function setActiveMultiplier(el) {
  buttons.forEach((b) => (b.className = 'x-2'));
  el.className = 'x';
}

// Обработчики множителей
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveMultiplier(button);
    multiplier = toNumber(button.textContent.replace('x', '')) || 1;
    refreshSummaryViews();
  });
});

// ===============================
// Bet intensity visual feedback
// ===============================
function updateBetVisualIntensity(currentBet, balanceVal) {
  const a = document.querySelector('.info-amount');
  const b = document.querySelector('.info-amount-2');
  // Нормализация: если баланс неизвестен, используем 100 как базу
  const base = Math.max(100, Number(balanceVal) || 0);
  const bet = Math.max(0, Number(currentBet) || 0);
  // Коэффициент 0..1 по доле от базы; ограничим до 1
  const ratio = Math.min(1, bet / base);
  // Порог для добавления класса is-large (например, >= 0.4 от базы)
  const makeLarge = ratio >= 0.4;
  [a, b].forEach(el => {
    if (!el) return;
    el.classList.toggle('is-large', makeLarge);
  });
}

// ===============================
// Chance ring creation/update
// ===============================
function ensureChanceRing() {
  const host = document.querySelector('.upgrade .game .overlap-2');
  if (!host) return null;
  let ring = host.querySelector('.chance-ring');
  if (!ring) {
    ring = document.createElement('div');
    ring.className = 'chance-ring';
    host.appendChild(ring);
  }
  // удалить возможную легенду, если была добавлена ранее
  const legacy = host.querySelector('.chance-legend');
  if (legacy) legacy.remove();
  return ring;
}

function updateChanceRing(chance) {
  const ring = ensureChanceRing();
  if (!ring) return;
  // ЗЕЛЁНЫЙ КОЛПАК ОТ ВЕРХА: ширина = chance
  // Порог сверху: percentThreshold = 100 - chance, p = 50*(1+cos(theta))
  let ch = Number(chance);
  if (!Number.isFinite(ch)) ch = 0;
  ch = Math.min(99.9, Math.max(0, ch));
  const percentThreshold = 100 - ch;
  let cosVal = percentThreshold/50 - 1; // ожидаем [-1..1]
  // Защита от накопленных ошибок и NaN
  if (!Number.isFinite(cosVal)) cosVal = 1;
  cosVal = Math.max(-1, Math.min(1, cosVal));
  const thetaDeg = Math.acos(cosVal) * 180 / Math.PI; // [0..180]
  const TOP_CENTER = 90;
  const base = (TOP_CENTER + ringOffsetDeg + 360) % 360;
  const greenStart = (base - thetaDeg + 360) % 360;
  const greenEnd = (base + thetaDeg + 360) % 360;
  const green = 'rgba(57,255,149,.9)';
  const redDim = 'rgba(255,103,103,.45)';
  let bg;
  if (greenStart <= greenEnd) {
    bg = `conic-gradient(${redDim} 0deg ${greenStart}deg, ${green} ${greenStart}deg ${greenEnd}deg, ${redDim} ${greenEnd}deg 360deg)`;
  } else {
    bg = `conic-gradient(${green} 0deg ${greenEnd}deg, ${redDim} ${greenEnd}deg ${greenStart}deg, ${green} ${greenStart}deg 360deg)`;
  }
  ring.style.background = bg;
}

// Когда Upgrade активна (после Apply) — меняем положение зелёной линии при первом наведении/фокусе
// (убрано) предспиновая рандомизация линии — теперь линия меняется только после завершения спина

// Ограничиваем ввод только числами (без изменения HTML)
betInputEl?.addEventListener('input', () => {
  // Оставляем только цифры, точку и запятую
  let cleaned = (betInputEl.textContent || '').replace(/[^0-9.,]/g, '');
  // Убираем ведущие нули (кроме "0."), и запрещаем минус
  cleaned = cleaned.replace(/^-/, '');
  // Если несколько разделителей, оставляем первый
  const parts = cleaned.split(/[.,]/);
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  } else if (parts.length === 2) {
    cleaned = parts[0] + '.' + parts[1];
  }
  // Запретить единственный ноль как значение — оставляем плейсхолдер
  if (cleaned === '0') cleaned = '';
  if (betInputEl.textContent !== cleaned) {
    betInputEl.textContent = cleaned;
    // перемещаем курсор в конец
    const range = document.createRange();
    range.selectNodeContents(betInputEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  // Если ввод изменился после Apply — снимаем фиксацию
  const currentVal = toNumber(cleaned);
  if (currentVal !== betAmount) {
    betApplied = false;
  }
  if (!cleaned || currentVal === 0) {
    betAmount = 0;
    betApplied = false;
  }
  refreshSummaryViews();
});

// Кнопка Apply — валидирует и «применяет» ставку (не меняем баланс, только фиксация)
applyBtn?.addEventListener('click', () => {
  const balance = getBalance();
  const inputAmount = toNumber(betInputEl?.textContent || '0');
  if (inputAmount <= 0) {
    showToast('Введите ставку');
    return;
  }
  if (inputAmount < 50) {
    showToast('Минимальная ставка 50');
    return;
  }
  if (inputAmount > balance) {
    showToast('Недостаточно средств на балансе');
    return;
  }
  betAmount = inputAmount; // сохраняем чистую ставку (без x)
  betApplied = true;
  refreshSummaryViews();
});

// Расчёт шанса — чем больше ставка относительно баланса, тем меньше шанс
function getActiveMultiplier() {
  const active = document.querySelector('.multiplier-button > .x');
  const m = active ? toNumber(active.textContent.replace('x', '')) : multiplier;
  return m > 0 ? m : 1;
}

function calculateChance(bet, _balIgnored) {
  // Шанс зависит ТОЛЬКО от абсолютного размера ставки и выбранного множителя
  const m = getActiveMultiplier();
  // База по множителю
  const baseMap = { 1.5: 66.6667, 2: 50, 3: 33.3333, 5: 20, 10: 10, 20: 5 };
  const base = baseMap[m] ?? (100 / m);
  const stake = Math.max(0, Number(bet) || 0);
  // Плавное убывание: при ставке = SOFT_CAP шанс ≈ base/2; при 0 — = base; при большой ставке → к 1
  const SOFT_CAP = 500; // настроечный параметр, при необходимости изменим
  const factor = SOFT_CAP / (SOFT_CAP + stake); // (0..1]
  const chance = clamp(base * factor, 1, base);
  return chance;
}

// Анимация стрелки: быстрый старт -> плавное замедление, нормализация угла после завершения
function spinArrowTo(finalAngle, onEndCb) {
  // Если стрелка отсутствует (сломана разметка) — аккуратно завершим без анимации
  if (!arrow) {
    showToast('Ошибка: элемент стрелки не найден');
    if (typeof onEndCb === 'function') onEndCb();
    return;
  }
  const baseTurns = 720; // два полных оборота минимум
  const start = currentRotation;
  const end = currentRotation + baseTurns + finalAngle;
  const duration = 3200; // ms
  const startTs = performance.now();
  const hardDeadline = startTs + duration + 1500; // страйк-бейлимит, чтобы не зависало

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  // КАЛИБРОВКА ВЕРХА: укажи, где визуально находится верхняя точка (стрелка = LOSE зона)
  // По умолчанию 90° (вверх). Если видишь, что верх смещён, поменяй значение ниже.
  const TOP_CENTER = 90;
  // ВАЖНО: учитывать сдвиг зелёной линии ringOffsetDeg, чтобы хитбокс совпадал с визуалом
  const offsetDeg = (360 - TOP_CENTER - ringOffsetDeg) % 360;
  const angleToPercent = (ang) => {
    const norm = ((ang % 360) + 360) % 360;
    const theta = ((norm + offsetDeg) % 360) * Math.PI / 180;
    const p = Math.round(50 * (1 + Math.cos(theta)));
    return clamp(p, 0, 100);
  };

  function finalize() {
    // Нормализуем и завершаем
    currentRotation = ((currentRotation % 360) + 360) % 360;
    arrow.style.transform = `rotate(${currentRotation}deg)`;
    if (positionPercentEl) positionPercentEl.textContent = `${Math.round(angleToPercent(currentRotation))}%`;
    if (typeof onEndCb === 'function') onEndCb();
  }

  function frame(now) {
    // Защита от редких глитчей RAF: жёсткий дедлайн
    if (now >= hardDeadline) {
      currentRotation = end;
      finalize();
      return;
    }
    const t = clamp((now - startTs) / duration, 0, 1);
    const eased = easeOutCubic(t);
    const ang = start + (end - start) * eased;
    currentRotation = ang;
    arrow.style.transform = `rotate(${ang}deg)`;
    if (positionPercentEl) positionPercentEl.textContent = `${Math.round(angleToPercent(ang))}%`;

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      finalize();
    }
  }

  requestAnimationFrame(frame);
}

// Кнопка Upgrade — считает шанс и крутит стрелку
upgradeBtn?.addEventListener('click', () => {
  if (isSpinning) { return; }
  if (betAmount <= 0) {
    showToast('Нужно ввести и применить ставку');
    return;
  }
  // Читаем актуальный баланс из UI на момент клика
  balance = getBalance();
  const chance = calculateChance(betAmount, balance);
  if (!Number.isFinite(chance)) {
    showToast('Ошибка вычисления шанса. Проверьте ставку и баланс.');
    return;
  }
  chanceDisplay.textContent = Math.round(chance).toString();

  // НЕ ПРИЦЕЛИВАЕМСЯ ПОД ИСХОД. Выбираем угол равномерно по кругу.
  // Решение будет принято только по проценту относительно центра и текущего chance.
  // Выбираем цель так, чтобы не попадать дважды подряд почти в одно и то же место
  const MIN_GAP_DEG = 12; // минимальный зазор между остановками
  const diffDeg = (a,b)=>{
    const d = Math.abs(((a - b + 540) % 360) - 180);
    return d;
  };
  let finalAngle = Math.random() * 360;
  if (lastStopAngle != null && isFinite(lastStopAngle)) {
    if (diffDeg(finalAngle, lastStopAngle) < MIN_GAP_DEG) {
      // Сдвинем в диапазоне, исключающем прилегание
      const span = 360 - 2*MIN_GAP_DEG;
      finalAngle = (lastStopAngle + MIN_GAP_DEG + Math.random()*span) % 360;
    }
  }

  // Списываем ставку перед розыгрышем через глобальный API
  if (window.GameBalanceAPI && !window.GameBalanceAPI.safeBet(betAmount, 'rubles')) {
    showToast('Недостаточно средств');
    isSpinning = false;
    document.querySelector('.upgrade-button')?.classList.remove('disabled');
    return;
  }

  // Убрать классы результата
  const gameEl = document.querySelector('.game');
  gameEl?.classList.remove('win', 'lose');

  // Блокируем кнопку на время анимации
  isSpinning = true;
  document.querySelector('.upgrade-button')?.classList.add('disabled');

  // Обеспечим наличие хитбокса на кончике стрелки (для визуального/логического референса)
  if (arrow && !arrow.querySelector('.hitbox')) {
    const hb = document.createElement('div');
    hb.className = 'hitbox';
    arrow.appendChild(hb);
  }

  spinArrowTo(finalAngle, () => {
    // По финальному углу определяем итог через порог шанса:
    // angleToPercent: верх=100, низ=0; Победа, если finalPercent >= (100 - chance)
    const TOP_CENTER = 90;
    // ВАЖНО: учитывать сдвиг зелёной линии ringOffsetDeg, чтобы хитбокс совпадал с визуалом
    const offsetDeg = (360 - TOP_CENTER - ringOffsetDeg) % 360;
    const norm = ((currentRotation % 360) + 360) % 360;
    const theta = ((norm + offsetDeg) % 360) * Math.PI / 180;
    const finalPercent = Math.round(50 * (1 + Math.cos(theta)));
    const chSafe = Number.isFinite(chance) ? Math.min(100, Math.max(0, chance)) : 0;
    const threshold = Math.round(100 - chSafe);
    const effectiveWin = finalPercent >= threshold; // равен порогу — считаем как WIN
    const halfRefund = false;

    if (effectiveWin) {
      const m = getActiveMultiplier();
      const winAmount = betAmount * m;
      if (window.GameBalanceAPI) {
        window.GameBalanceAPI.payWinningsAndUpdate(winAmount, 'rubles');
      }
      gameEl?.classList.add('win');
    } else {
      gameEl?.classList.add('lose');
    }

    // Сброс вводимой ставки и статуса Apply
    if (betInputEl) betInputEl.textContent = '';
    betAmount = 0;
    betApplied = false;
    refreshSummaryViews();

    // Для следующего раунда — поставить зелёную линию в одно из фиксированных положений: TOP / LEFT / BOTTOM
    const allowed = [0, 90, 180]; // 0: top, 90: left, 180: bottom относительно TOP_CENTER
    ringOffsetDeg = allowed[Math.floor(Math.random() * allowed.length)];
    updateChanceRing(chance);

    // Разблокировать кнопку
    isSpinning = false;
    document.querySelector('.upgrade-button')?.classList.remove('disabled');
    // Запомним финальную позицию для следующего анти-повтора
    lastStopAngle = currentRotation; // уже нормализован в finalize()
  });
});

// Первая инициализация отображений
refreshSummaryViews(0);
