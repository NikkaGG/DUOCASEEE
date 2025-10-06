// Optimized Blackjack Game with Global Balance Integration
// GitHub Images: https://github.com/Pacific1a/img/tree/main/BlackJack/card

(function () {
  'use strict';

  const SUITS = ["heart", "blackheart", "rhomb", "CrossIt"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const CARD_BACK_SRC = "https://github.com/Pacific1a/img/blob/main/BlackJack/card/CrossIt/Hide%20Сard.png?raw=true";
  const GITHUB_BASE = "https://raw.githubusercontent.com/Pacific1a/img/main/BlackJack/card";

  // --- Model ---
  class Card {
    constructor(suit, rank) {
      this.suit = suit;
      this.rank = rank;
      this.value = Card.valueOf(rank);
    }
    static valueOf(rank) {
      if (rank === "A") return 11;
      if (["K", "Q", "J"].includes(rank)) return 10;
      return parseInt(rank, 10);
    }
    get image() {
      // GitHub repository structure: /BlackJack/card/{suit}/{rank}.png
      return `${GITHUB_BASE}/${this.suit}/${this.rank}.png`;
    }
  }

  class Deck {
    constructor() {
      this.reset();
    }
    shuffle() {
      const a = this.cards;
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
    reset() {
      this.cards = [];
      for (const s of SUITS) {
        for (const r of RANKS) this.cards.push(new Card(s, r));
      }
      this.shuffle();
    }
    draw() {
      if (this.cards.length === 0) {
        // Fresh deck when exhausted
        this.reset();
      }
      return this.cards.pop();
    }
  }

  // --- Helpers ---
  function score(hand) {
    let total = 0;
    let aces = 0;
    for (const c of hand) {
      total += c.value;
      if (c.rank === "A") aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function isSoft17(hand) {
    // Hit on soft 17: total 17 with an ace counted as 11
    let total = 0, aces = 0;
    for (const c of hand) {
      total += c.value; if (c.rank === "A") aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    if (total !== 17) return false;
    // If we can reduce by 10 and still be >= 7, means one ace was 11
    return hand.some(c => c.rank === "A") && (total - 10) >= 7;
  }

  // --- View ---
  const el = {
    dealerCards: document.getElementById("dealer-cards"),
    playerCards: document.getElementById("player-cards"),
    result: document.getElementById("result-message"),
    gameArea: document.querySelector('.game-2'),
    buttonsBar: document.querySelector('.buttons'),
    gameRoot: document.querySelector('.game'),
    tableOverlay: document.getElementById('table-overlay'),
    centerOverlay: document.querySelector('.center'),
    balanceMoney: document.getElementById("balance-money"),
    balanceBet: document.getElementById("balance-bet"),
    betAmount: document.getElementById("bet-amount"),
    btn: {
      hit: document.getElementById("btn-hit"),
      stand: document.getElementById("btn-stand"),
      double: document.getElementById("btn-double"),
      split: document.getElementById("btn-split"),
      betMinus: document.getElementById("btn-bet-minus"),
      betPlus: document.getElementById("btn-bet-plus"),
      betHalf: document.getElementById("btn-bet-half"),
      betDouble: document.getElementById("btn-bet-double"),
      newGame: document.getElementById("btn-new-game"),
    },
    scoreBgs: document.querySelectorAll('.score-bg'),
  };

  function clear(elm) { while (elm.firstChild) elm.removeChild(elm.firstChild); }

  function setBetControlsEnabled(enabled) {
    const btns = [
      el.btn.betMinus,
      el.btn.betPlus,
      el.btn.betHalf,
      el.btn.betDouble,
    ];
    btns.forEach(btn => {
      if (!btn) return;
      btn.style.pointerEvents = enabled ? "auto" : "none";
      btn.style.opacity = enabled ? "1" : "0.45";
    });
  }

  function setNewGameEnabled(enabled) {
    const btn = el.btn.newGame;
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.pointerEvents = enabled ? "auto" : "none";
    btn.style.opacity = enabled ? "1" : "0.6";
  }

  function renderHand(cards, container, { hideHole = false } = {}) {
    if (!container) return;
    if (!cards || cards.length === 0) {
      clear(container);
      return;
    }

    // Remove any excess cards from previous renders
    while (container.children.length > cards.length) {
      container.removeChild(container.lastChild);
    }

    const baseStack = [
      { top: 28, left: -4 },
      { top: 16, left: 16 },
      { top: 0, left: 37 },
    ];
    const stackLayout = [];
    for (let idx = 0; idx < cards.length; idx++) {
      if (idx < baseStack.length) {
        stackLayout.push({ ...baseStack[idx] });
      } else {
        const prev = stackLayout[idx - 1];
        stackLayout.push({
          top: prev.top - 12,
          left: prev.left + 19,
        });
      }
    }

    cards.forEach((card, idx) => {
      let img = container.children[idx];
      const isNewCard = !img;
      if (!img) {
        img = document.createElement("img");
        img.width = 57;
        img.height = 77;
        img.alt = "";
        img.classList.add("card-img", "bj-predeal");
        img.style.visibility = "hidden";
        img.onerror = function () { this.style.display = 'none'; };
        container.appendChild(img);
      }

      img.classList.remove("cards-2", "cards-3", "cards-4");
      if (idx === 0) img.classList.add("cards-2");
      else if (idx === 1) img.classList.add("cards-3");
      else img.classList.add("cards-4");

      img.style.zIndex = String(10 + idx);
      const isHoleCard = hideHole && idx === cards.length - 1;
      const nextSrc = isHoleCard ? CARD_BACK_SRC : card.image;
      const sourceChanged = img.dataset.currentSrc !== nextSrc;
      if (sourceChanged) {
        img.style.visibility = "hidden";
        img.src = nextSrc;
        img.dataset.currentSrc = nextSrc;
      }

      const stackPos = stackLayout[idx];
      img.style.top = `${stackPos.top}px`;
      img.style.left = `${stackPos.left}px`;
      const finalTransform = `translate3d(0, 0, 0) scale(1)`;
      img.dataset.finalTransform = finalTransform;

      const baseOffsetX = stackPos.left - 140;
      const baseOffsetY = stackPos.top - 180;
      img.style.setProperty("--deal-from-x", `${baseOffsetX}px`);
      img.style.setProperty("--deal-from-y", `${baseOffsetY}px`);
      img.style.setProperty("--deal-from-rot", `-6deg`);
      img.style.setProperty("--deal-from-scale", idx === cards.length - 1 ? 1.02 : 0.96);

      if (isNewCard) {
        const shouldAnimate = true;
        if (shouldAnimate) {
          const token = `${Date.now()}-${Math.random()}`;
          img.dataset.dealToken = token;
          img.classList.remove("bj-deal");
          img.classList.add("bj-predeal");
          img.style.visibility = "hidden";
          img.style.setProperty("--deal-delay", `${Math.min(idx, 5) * 120}ms`);
          const beginAnimation = () => {
            if (img.dataset.dealToken !== token || img.classList.contains("bj-deal")) return;
            requestAnimationFrame(() => {
              if (img.dataset.dealToken !== token || img.classList.contains("bj-deal")) return;
              requestAnimationFrame(() => {
                if (img.dataset.dealToken !== token || img.classList.contains("bj-deal")) return;
                img.style.visibility = "visible";
                img.classList.add("bj-deal");
                img.classList.remove("bj-predeal");
              });
            });
          };
          const decoded = typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve();
          decoded.then(beginAnimation);
          const removeAnim = () => {
            img.classList.remove("bj-deal");
            img.style.removeProperty("--deal-delay");
            img.style.visibility = "visible";
            img.style.opacity = "1";
            img.style.transform = finalTransform;
            delete img.dataset.dealToken;
          };
          img.addEventListener("animationend", removeAnim, { once: true });
          if (sourceChanged) {
            const onLoad = () => {
              beginAnimation();
              img.removeEventListener("load", onLoad);
            };
            img.addEventListener("load", onLoad);
          }
        } else {
          img.classList.remove("bj-deal");
          img.classList.remove("bj-predeal");
          img.style.removeProperty("--deal-delay");
          img.style.visibility = "visible";
          img.style.opacity = "1";
          img.style.transform = finalTransform;
        }
      } else {
        img.classList.remove("bj-predeal");
        img.classList.remove("bj-deal");
        img.style.removeProperty("--deal-delay");
        img.style.visibility = "visible";
        img.style.opacity = "1";
        img.style.transform = finalTransform;
      }
    });
  }

  function ensureAnimationStyles() {
    if (document.getElementById("blackjack-deal-anim-style")) return;
    const style = document.createElement("style");
    style.id = "blackjack-deal-anim-style";
    style.textContent = `
      .card-img {
        display: inline-block;
        position: relative;
        will-change: transform, opacity;
        backface-visibility: hidden;
        transform-origin: center;
      }
      .card-img.bj-predeal {
        opacity: 0;
        transform: translate3d(var(--deal-from-x, -140px), var(--deal-from-y, -180px), 0) rotate(var(--deal-from-rot, -8deg)) scale(var(--deal-from-scale, 0.82));
      }
      .card-img.bj-deal {
        animation: blackjackDeal var(--deal-duration, 520ms) cubic-bezier(0.22, 0.85, 0.34, 1) forwards;
        animation-delay: var(--deal-delay, 0ms);
        animation-fill-mode: both;
      }
      .card-img.card-flip {
        animation: blackjackFlip 300ms ease-in-out forwards;
      }
      @keyframes blackjackDeal {
        0% {
          opacity: 0;
          transform: translate3d(var(--deal-from-x, -140px), var(--deal-from-y, -180px), 0) rotate(var(--deal-from-rot, -8deg)) scale(var(--deal-from-scale, 0.82));
        }
        60% {
          opacity: 1;
          transform: translate3d(10px, -6px, 0) rotate(2deg) scale(1.06);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
        }
      }
      @keyframes blackjackFlip {
        0% {
          transform: rotateY(0deg) scale(1);
          opacity: 1;
        }
        45% {
          transform: rotateY(85deg) scale(0.95);
          opacity: 0.3;
        }
        50% {
          transform: rotateY(90deg) scale(0.9);
          opacity: 0;
        }
        55% {
          transform: rotateY(-85deg) scale(0.95);
          opacity: 0.3;
        }
        100% {
          transform: rotateY(0deg) scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setButtonsEnabled(enabled, ctx) {
    const set = (b, on) => { 
      if (!b) return; 
      b.style.pointerEvents = on ? "auto" : "none"; 
      b.style.opacity = on ? "1" : "0.5"; 
    };
    
    const hitEnabled = enabled && !ctx.playerBusted;
    set(el.btn.hit, hitEnabled);
    set(el.btn.stand, enabled);
    
    // Double: только на первых 2 картах, если не было действий
    const doubleEnabled = enabled && ctx.player.length === 2 && !ctx.hasActed && !ctx.playerBusted;
    set(el.btn.double, doubleEnabled);
    
    // Split: только если 2 карты одного ранга, не было действий
    const canSplit = enabled && ctx.player.length === 2 && 
                     ctx.player[0].rank === ctx.player[1].rank && 
                     !ctx.hasActed && !ctx.playerBusted;
    set(el.btn.split, canSplit);
  }

  function showResult(msg) {
    if (!el.result) return;
    el.result.textContent = msg;
    el.result.classList.add("show");
    setTimeout(() => el.result && el.result.classList.remove("show"), 1500);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function placeWinBadge(side) {
    const targetContainer = side === 'player' ? el.playerCards : el.dealerCards;
    if (!targetContainer) return;
    // remove existing badge
    const old = targetContainer.querySelector('.win-badge');
    if (old) old.remove();
    const badge = document.createElement('img');
    badge.src = 'https://github.com/Pacific1a/img/blob/main/BlackJack/Blackjack%20win.png?raw=true';
    badge.alt = 'Win';
    badge.className = 'win-badge';
    targetContainer.parentElement.style.position = 'relative';
    targetContainer.parentElement.appendChild(badge);
  }

  // --- Controller / Game ---
  class Game {
    constructor() {
      this.bet = 50;
      this.deck = new Deck();
      this.player = [];
      this.dealer = [];
      this.roundOver = false;
      this.hasActed = false;
      this.dealLock = false;
      this.playerBusted = false;
      this.betPlaced = false; // Track if bet was deducted
      
      ensureAnimationStyles();
      this.bindUI();
      this.waitForBalance();
      setBetControlsEnabled(true);
      setNewGameEnabled(true);
      setButtonsEnabled(false, this);
      
      if (el.gameArea) el.gameArea.classList.add('hidden');
      if (el.buttonsBar) el.buttonsBar.classList.add('hidden');
      if (el.tableOverlay) el.tableOverlay.style.display = 'block';
      if (el.centerOverlay) el.centerOverlay.style.display = 'flex';
      
      renderHand([], el.dealerCards, { hideHole: false });
      renderHand([], el.playerCards, { hideHole: false });
      this.updateScores(false);
      
      console.log('🃏 BlackJack готов!');
    }

    waitForBalance() {
      if (window.GlobalBalance && window.GlobalBalance.isReady) {
        this.updateBetBalanceUI();
      } else {
        setTimeout(() => this.waitForBalance(), 100);
      }
    }

    updateBetBalanceUI() {
      if (!window.GlobalBalance) return;
      
      const balance = window.GlobalBalance.getChips();
      if (el.betAmount) el.betAmount.textContent = String(this.bet);
      
      // Balance updates automatically via GlobalBalance
    }

    bindUI() {
      el.btn.hit && el.btn.hit.addEventListener("click", () => this.hit());
      el.btn.stand && el.btn.stand.addEventListener("click", () => this.stand());
      el.btn.double && el.btn.double.addEventListener("click", () => this.doubleDown());
      el.btn.split && el.btn.split.addEventListener("click", () => this.split());
      el.btn.betMinus && el.btn.betMinus.addEventListener("click", () => this.changeBet(-10));
      el.btn.betPlus && el.btn.betPlus.addEventListener("click", () => this.changeBet(10));
      el.btn.betHalf && el.btn.betHalf.addEventListener("click", () => this.setBet(Math.max(10, Math.floor(this.bet / 2))));
      el.btn.betDouble && el.btn.betDouble.addEventListener("click", () => this.setBet(this.bet * 2));
      el.btn.newGame && el.btn.newGame.addEventListener("click", () => this.newRound(true));
    }

    setBet(value) {
      if (!window.GlobalBalance) return;
      const balance = window.GlobalBalance.getChips();
      this.bet = Math.max(10, Math.min(value, balance));
      this.updateBetBalanceUI();
    }
    
    changeBet(delta) { 
      this.setBet(this.bet + delta); 
    }

    async newRound(force = false) {
      if (!force && !this.roundOver) return;
      
      // Check balance
      if (!window.GameBalanceAPI) {
        showResult('Balance API not ready');
        return;
      }
      
      if (!window.GameBalanceAPI.canPlaceBet(this.bet, 'chips')) {
        showResult('Недостаточно фишек');
        return;
      }
      
      // Place bet
      const success = await window.GameBalanceAPI.placeBet(this.bet, 'chips');
      if (!success) {
        showResult('Ошибка ставки');
        return;
      }
      
      this.betPlaced = true;
      this.roundOver = false;
      this.hasActed = false;
      this.dealLock = false;
      this.playerBusted = false;
      this.player = [];
      this.dealer = [];
      this.deck = new Deck();
      
      setBetControlsEnabled(false);
      setNewGameEnabled(false);
      this.updateBetBalanceUI();
      el.result && (el.result.textContent = "");
      // show game elements when starting
      if (el.gameArea) el.gameArea.classList.remove('hidden');
      if (el.buttonsBar) el.buttonsBar.classList.remove('hidden');
      if (el.tableOverlay) el.tableOverlay.style.display = 'none';
      if (el.centerOverlay) el.centerOverlay.style.display = 'none';
      // remove winner badges if any
      const oldBadges = document.querySelectorAll('.win-badge');
      oldBadges.forEach(b => b.remove());

      // Initial deal: 2 cards to player, 2 cards to dealer (last hidden)
      // Чередуем раздачу: игрок → дилер → игрок → дилер
      await this.dealCard(this.player, el.playerCards, { hideHole: false });
      await sleep(300);
      await this.dealCard(this.dealer, el.dealerCards, { hideHole: false });
      await sleep(300);
      await this.dealCard(this.player, el.playerCards, { hideHole: false });
      await sleep(300);
      await this.dealCard(this.dealer, el.dealerCards, { hideHole: true });
      await sleep(200);
      
      setButtonsEnabled(true, this);
    }

    updateScores(revealDealer) {
      const ps = this.player.length ? String(score(this.player)) : "0";
      if (el.scoreBgs && el.scoreBgs.length >= 2) {
        let dealerShown = 0;
        if (revealDealer) {
          dealerShown = score(this.dealer);
        } else {
          const visible = [];
          if (this.dealer[0]) visible.push(this.dealer[0]);
          dealerShown = score(visible);
        }
        el.scoreBgs[0].textContent = String(dealerShown || 0);
        el.scoreBgs[1].textContent = ps;
      }
    }

    async revealDealer(withFlip = false) {
      if (!withFlip) {
        renderHand(this.dealer, el.dealerCards, { hideHole: false });
      } else {
        // Плавный переворот закрытой карты
        const imgs = el.dealerCards.querySelectorAll('img');
        const hiddenIdx = this.dealer.length - 1;
        const hiddenImg = imgs[hiddenIdx];
        
        if (hiddenImg) {
          const finalSrc = this.dealer[hiddenIdx] ? this.dealer[hiddenIdx].image : hiddenImg.dataset.currentSrc;
          
          // Добавляем класс анимации
          hiddenImg.classList.add('card-flip');
          
          // В середине анимации меняем картинку
          await sleep(150); // Половина анимации (300ms / 2)
          hiddenImg.src = finalSrc;
          hiddenImg.dataset.currentSrc = finalSrc;
          
          // Ждём завершения анимации
          await sleep(150);
          hiddenImg.classList.remove('card-flip');
        }
        
        renderHand(this.dealer, el.dealerCards, { hideHole: false });
      }
      this.updateScores(true);
    }

    async dealCard(target, container, { hideHole }) {
      target.push(this.deck.draw());
      renderHand(target, container, { hideHole });
      this.updateScores(false);
      await sleep(260);
    }

    // Standard rule: blackjack is 21 with exactly two cards
    isBlackjack(hand) { return hand.length === 2 && score(hand) === 21; }
    isTenOrAce(card) { return card.rank === "A" || card.value === 10; }

    async hit() {
      if (this.roundOver || this.dealLock) return;
      this.dealLock = true;
      try {
        this.hasActed = true;
        this.player.push(this.deck.draw());
        renderHand(this.player, el.playerCards, { hideHole: false });
        this.updateScores(false);
        await sleep(260);
        const s = score(this.player);
        if (s > 21) {
          this.playerBusted = true;
          setButtonsEnabled(true, this);
        } else {
          setButtonsEnabled(true, this);
        }
      } finally {
        this.dealLock = false;
      }
    }

    async stand() {
      if (this.roundOver) return;
      const busted = this.playerBusted;
      await this.finishRound({ playerBusted: busted, revealDealerCards: true });
    }

    async finishRound({ playerBusted, revealDealerCards = true }) {
      setButtonsEnabled(false, this);
      
      if (revealDealerCards) {
        // Плавно открываем закрытую карту дилера
        await sleep(400);
        await this.revealDealer(true);
        await sleep(600);
        
        // Дилер берет карты по правилам (< 17 или soft 17)
        while (true) {
          const d = score(this.dealer);
          if (d < 17 || (d === 17 && isSoft17(this.dealer))) {
            await sleep(500);
            this.dealer.push(this.deck.draw());
            renderHand(this.dealer, el.dealerCards, { hideHole: false });
            this.updateScores(true);
            await sleep(800);
            continue;
          }
          break;
        }
      }
      
      this.playerBusted = false;
      await sleep(300);
      this.settleEndOfRound();
    }

    async doubleDown() {
      if (this.roundOver || this.player.length !== 2 || this.hasActed) return;
      
      // Проверяем баланс для удвоения ставки
      if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(this.bet, 'chips')) {
        showResult("Недостаточно фишек для удвоения");
        return;
      }
      
      // Списываем дополнительную ставку
      const success = await window.GameBalanceAPI.placeBet(this.bet, 'chips');
      if (!success) {
        showResult("Ошибка удвоения ставки");
        return;
      }
      
      this.bet *= 2; // Удваиваем ставку
      this.hasActed = true;
      
      // Берем одну карту и автоматически stand
      await sleep(300);
      this.player.push(this.deck.draw());
      renderHand(this.player, el.playerCards, { hideHole: false });
      this.updateScores(false);
      await sleep(500);
      
      const s = score(this.player);
      if (s > 21) {
        this.playerBusted = true;
      }
      
      // Автоматически завершаем ход
      this.stand();
    }

    split() {
      // Split пока не реализован (требует сложной логики с двумя руками)
      showResult("Split скоро будет доступен");
    }

    settleEndOfRound() {
      const p = score(this.player);
      const d = score(this.dealer);
      const playerBJ = this.isBlackjack(this.player);
      const dealerBJ = this.isBlackjack(this.dealer);
      let outcome = "push";
      let winAmount = 0;

      if (playerBJ && dealerBJ) {
        outcome = "push";
        winAmount = this.bet; // Return bet
      } else if (playerBJ) {
        outcome = "blackjack";
        winAmount = this.bet + Math.floor(this.bet * 1.5); // Bet + 3:2 payout
      } else if (p > 21) {
        outcome = "loss";
        winAmount = 0; // Lost bet
      } else if (dealerBJ) {
        outcome = "loss";
        winAmount = 0;
      } else if (d > 21) {
        outcome = "win";
        winAmount = this.bet * 2; // Bet + win
      } else if (p > d) {
        outcome = "win";
        winAmount = this.bet * 2;
      } else if (p < d) {
        outcome = "loss";
        winAmount = 0;
      } else {
        outcome = "push";
        winAmount = this.bet; // Return bet
      }

      // Pay winnings via GameBalanceAPI
      if (winAmount > 0 && window.GameBalanceAPI) {
        window.GameBalanceAPI.payWinnings(winAmount, 'chips');
        console.log(`💰 BlackJack ${outcome}: +${winAmount} chips`);
      } else {
        console.log(`💸 BlackJack ${outcome}: -${this.bet} chips`);
      }
      
      this.betPlaced = false;
      this.updateBetBalanceUI();

      // Do not show textual result overlay

      this.roundOver = true;
      setButtonsEnabled(false, this);
      // Place winner badge
      if (outcome === 'win' || outcome === 'blackjack') placeWinBadge('player');
      else if (outcome === 'loss') placeWinBadge('dealer');
      // Keep result visible for 5 seconds, then restore overlay and hide game UI (no auto-restart)
      setTimeout(() => {
        renderHand([], el.dealerCards, { hideHole: false });
        renderHand([], el.playerCards, { hideHole: false });
        if (el.gameArea) el.gameArea.classList.add('hidden');
        if (el.buttonsBar) el.buttonsBar.classList.add('hidden');
        if (el.tableOverlay) el.tableOverlay.style.display = 'block';
        if (el.centerOverlay) el.centerOverlay.style.display = 'flex';
        setBetControlsEnabled(true);
        setNewGameEnabled(true);
      }, 5000);
    }
  }

  function init() {
    new Game();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
