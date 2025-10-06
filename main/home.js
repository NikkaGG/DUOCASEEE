// Home page interactions: banner carousel, section-menu filters, live streak conveyor
(function(){
  // Utilities
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // =====================
  // Banner carousel
  // =====================
  const bannerEl = $('#banner');
  const bannerTitleEl = $('#banner-title');
  const bannerTextEl = $('#banner-text');
  const moreBtn = bannerEl ? bannerEl.querySelector('.MORE-button') : null;

  const banners = [
    {
      title: 'Реферальная система',
      html: 'Приглашай друзей и <br>получай бонусы.',
      bg: 'linear-gradient(90deg, rgba(255, 65, 62, 0.73) 0%, rgba(255,64,62,0.8) 100%)',
      shadow: '0px 0px 55px #ff403f54'
    },
    {
      title: 'Новостной канал',
      html: 'Всегда в курсе свежих обновлений <br>и событий.',
      bg: 'linear-gradient(90deg, rgba(62, 126, 255, 0.69) 0%, rgba(62,125,255,0.8) 100%)',
      shadow: '0px 0px 55px rgba(62,125,255,0.33)'
    },
    {
      title: 'Сотрудничество',
      html: 'Свяжись с нами<br>напрямую через бота.',
      bg: 'linear-gradient(90deg, rgba(57, 255, 149, 0.69) 0%, rgba(57,255,149,0.85) 100%)',
      shadow: '0px 0px 55px rgba(57,255,149,0.32)'
    }
  ];
  let bannerIdx = 0;
  let bannerAutoTimer = null;
  const ellipsesWrap = bannerEl ? bannerEl.querySelector('.ellipse-3') : null;
  const ellipseDots = ellipsesWrap ? Array.from(ellipsesWrap.children) : [];

  function applyBanner(idx){
    if (!bannerEl || !bannerTitleEl || !bannerTextEl) return;
    const b = banners[idx % banners.length];
    // fade out text
    bannerTitleEl.classList.add('fade-out');
    bannerTextEl.classList.add('fade-out');
    // after transition, swap and fade in
    setTimeout(()=>{
      bannerTitleEl.innerHTML = b.title;
      bannerTextEl.innerHTML = b.html;
      bannerEl.style.background = b.bg;
      bannerEl.style.boxShadow = b.shadow;
      bannerTitleEl.classList.remove('fade-out');
      bannerTextEl.classList.remove('fade-out');
      bannerTitleEl.classList.add('fade-in');
      bannerTextEl.classList.add('fade-in');
      setTimeout(()=>{
        bannerTitleEl.classList.remove('fade-in');
        bannerTextEl.classList.remove('fade-in');
      }, 250);
    }, 180);
    // update ellipse indicators
    if (ellipseDots.length){
      ellipseDots.forEach((d, i)=>{
        d.classList.toggle('active', i === (idx % banners.length));
        // minimal inline style feedback if no CSS present
        d.style.opacity = i === (idx % banners.length) ? '1' : '0.45';
        d.style.transform = i === (idx % banners.length) ? 'scale(1.08)' : 'scale(1)';
        d.style.transition = 'all .2s ease';
      });
    }
  }

  function nextBanner(){
    bannerIdx = (bannerIdx + 1) % banners.length;
    applyBanner(bannerIdx);
  }
  function prevBanner(){
    bannerIdx = (bannerIdx - 1 + banners.length) % banners.length;
    applyBanner(bannerIdx);
  }
  function startAutoRotate(){
    stopAutoRotate();
    bannerAutoTimer = setInterval(nextBanner, 7000);
  }
  function stopAutoRotate(){
    if (bannerAutoTimer) clearInterval(bannerAutoTimer);
    bannerAutoTimer = null;
  }

  if (bannerEl){
    applyBanner(0);
    if (moreBtn){
      moreBtn.addEventListener('click', (e)=>{ e.preventDefault(); nextBanner(); });
    }
    // also allow clicking banner area to switch
    bannerEl.addEventListener('click', (e)=>{
      if (e.target.closest('.MORE-button')) return; // already handled
      nextBanner();
    });
    // ellipse indicators click
    if (ellipseDots.length){
      ellipseDots.forEach((d, i)=>{
        d.style.cursor = 'pointer';
        d.addEventListener('click', (e)=>{
          e.stopPropagation();
          bannerIdx = i;
          applyBanner(bannerIdx);
        });
      });
    }
    // swipe support (touch)
    let touchStartX = 0, touchStartY = 0, swiping = false;
    const SWIPE_THRESHOLD = 40;
    bannerEl.addEventListener('touchstart', (e)=>{
      if (!e.touches || !e.touches.length) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      swiping = true;
      stopAutoRotate();
    }, {passive: true});
    bannerEl.addEventListener('touchmove', (e)=>{
      // prevent vertical scroll only when horizontal swipe is detected
      if (!swiping || !e.touches || !e.touches.length) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = Math.abs(t.clientY - touchStartY);
      if (Math.abs(dx) > dy && Math.abs(dx) > 8) {
        e.preventDefault();
      }
    }, {passive: false});
    bannerEl.addEventListener('touchend', (e)=>{
      if (!swiping) return;
      swiping = false;
      const changed = e.changedTouches && e.changedTouches[0];
      const dx = changed ? (changed.clientX - touchStartX) : 0;
      if (dx <= -SWIPE_THRESHOLD) nextBanner();
      else if (dx >= SWIPE_THRESHOLD) prevBanner();
      startAutoRotate();
    });
    // auto-rotate
    startAutoRotate();
  }

  // =====================
  // Section menu filters
  // =====================
  const sectionMenu = $('.section-menu');
  const selectIndicator = sectionMenu ? sectionMenu.querySelector('.select') : null;
  const caseContainer = $('.case');
  const caseCards = caseContainer ? $$('.case > *', document) : [];
  const originalOrder = caseCards.slice();

  function moveSelectTo(el){
    if (!selectIndicator || !el) return;
    const parentRect = sectionMenu.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const SELECT_W = 74; // must match CSS width
    // Center select under the element
    let left = (r.left - parentRect.left) + (r.width / 2) - (SELECT_W / 2);
    // Clamp within container
    left = Math.max(0, Math.min(left, parentRect.width - SELECT_W));
    selectIndicator.style.width = SELECT_W + 'px';
    selectIndicator.style.transform = `translateX(${left}px)`;
  }

  function setActive(el){
    if (!sectionMenu) return;
    $$('.section-menu > *').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    moveSelectTo(el);
  }

  function getPrice(card){
    const raw = card?.getAttribute('data-price') || '0';
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function showCard(card, show){
    card.style.display = show ? '' : 'none';
  }
  function sortCardsAsc(){
    if (!caseContainer) return;
    const sorted = caseCards.slice().sort((a,b)=> getPrice(a) - getPrice(b));
    sorted.forEach(el=> caseContainer.appendChild(el));
    // ensure all visible
    sorted.forEach(el=> showCard(el, true));
  }
  function sortCardsDesc(){
    if (!caseContainer) return;
    const sorted = caseCards.slice().sort((a,b)=> getPrice(b) - getPrice(a));
    sorted.forEach(el=> caseContainer.appendChild(el));
    sorted.forEach(el=> showCard(el, true));
  }
  function restoreOriginalOrder(){
    if (!caseContainer) return;
    originalOrder.forEach(el=> caseContainer.appendChild(el));
    originalOrder.forEach(el=> showCard(el, true));
  }

  function applyFilter(type){
    if (!caseCards.length) return;
    switch(type){
      case 'low':
        sortCardsAsc();
        break;
      case 'high':
        sortCardsDesc();
        break;
      case 'new': {
        // show only data-new="true"
        restoreOriginalOrder();
        caseCards.forEach(card => {
          const isNew = card.getAttribute('data-new') === 'true';
          showCard(card, isNew);
        });
        break;
      }
      case 'chips': {
        // no chips yet — hide all
        caseCards.forEach(card => showCard(card, false));
        break;
      }
      case 'all':
      default:
        restoreOriginalOrder();
        break;
    }
  }

  function bindFilters(){
    if (!sectionMenu) return;
    // Query items by order, excluding .select
    const items = $$('.section-menu > *').filter(el=>!el.classList.contains('select'));
    const [allItem, chipsItem, newItem, lowItem, highItem] = items;

    if (allItem){
      allItem.addEventListener('click', ()=>{ setActive(allItem); applyFilter('all'); });
    }
    if (chipsItem){
      chipsItem.addEventListener('click', ()=>{ setActive(chipsItem); applyFilter('chips'); });
    }
    if (newItem){
      newItem.addEventListener('click', ()=>{ setActive(newItem); applyFilter('new'); });
    }
    if (lowItem){
      lowItem.addEventListener('click', ()=>{ setActive(lowItem); applyFilter('low'); });
    }
    if (highItem){
      highItem.addEventListener('click', ()=>{ setActive(highItem); applyFilter('high'); });
    }

    // Init
    if (allItem){
      setActive(allItem);
      applyFilter('all');
      // place select after layout is ready
      requestAnimationFrame(()=> moveSelectTo(allItem));
      window.addEventListener('resize', ()=>{
        const current = $('.section-menu > .active');
        if (current) moveSelectTo(current);
      });
    }
  }

  bindFilters();

  // =====================
  // Smooth conveyor for streak (identical to upgrade)
  // =====================
  class MainSmoothCyclicalConveyor {
    constructor() {
        this.isActive = false;
        this.animationId = null;
        this.streakContainer = null;
        this.conveyorContainer = null;
        this.conveyorTrack = null;
        this.lastFrameTime = null;
        this.isShuffling = false;
        
        // Все доступные призы из папки main/img
        this.prizesPool = [
            'https://raw.githubusercontent.com/Pacific1a/img/af9521ea7091209117e10a6160ad12ff29d7364e/imgALL/very-high-prize.svg',
            'https://raw.githubusercontent.com/Pacific1a/img/af9521ea7091209117e10a6160ad12ff29d7364e/imgALL/medium-prize.svg',
            'https://raw.githubusercontent.com/Pacific1a/img/af9521ea7091209117e10a6160ad12ff29d7364e/imgALL/low-prize.svg',
            'https://raw.githubusercontent.com/Pacific1a/img/af9521ea7091209117e10a6160ad12ff29d7364e/imgALL/very-low-prize.svg',
            'https://raw.githubusercontent.com/Pacific1a/img/af9521ea7091209117e10a6160ad12ff29d7364e/imgALL/ultra-low-prize.svg'
        ];
        
        this.conveyorSpeed = 0.5;
        this.prizeWidth = 70;
        this.position = 0;
        
        this.init();
    }
    
    init() {
        this.streakContainer = document.querySelector('.streak');
        if (!this.streakContainer) {
            return;
        }
        
        this.setupStyles();
        this.setupConveyor();
        this.startConveyor();
    }
    
    setupStyles() {
        if (document.getElementById('main-smooth-conveyor-style')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'main-smooth-conveyor-style';
        style.textContent = `
            .streak {
                position: relative;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .smooth-conveyor-container {
                flex: 1;
                height: 60px;
                overflow: hidden;
                position: relative;
                background: transparent;
            }
            
            .smooth-conveyor-track {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                display: flex;
                align-items: center;
                gap: 15px;
                will-change: transform;
                backface-visibility: hidden;
                perspective: 1000px;
                transform-style: preserve-3d;
            }
            
            .smooth-prize {
                flex-shrink: 0;
                position: relative;
            }
            
            .smooth-prize img {
                display: block;
                transition: filter 0.3s ease;
            }
            
            .smooth-prize img:hover {
                filter: brightness(1.1) saturate(1.1);
            }
        `;
        document.head.appendChild(style);
    }
    
    setupConveyor() {
        const existingPrizes = this.streakContainer.querySelectorAll('.img-2, .img-3');
        const frameElement = this.streakContainer.querySelector('.frame');


        // Создаем движущуюся дорожку
        const conveyorTrack = document.createElement('div');
        conveyorTrack.className = 'smooth-conveyor-track';

        // Сохраняем в объект класса ДО вызова updateConveyorDOM
        this.conveyorContainer = conveyorContainer;
        this.conveyorTrack = conveyorTrack;

        // Массив активных призов
        this.activePrizes = [];

        existingPrizes.forEach((prize) => {
            this.activePrizes.push({
                src: prize.src,
                className: prize.className
            });
            prize.remove();
        });

        // Добавляем дополнительные призы для заполнения
        for (let i = 0; i < 8; i++) {
            const randomPrize = this.getRandomPrize();
            this.activePrizes.push({
                src: randomPrize,
                className: this.getPrizeClass(randomPrize)
            });
        }

        // Теперь можно обновлять DOM
        this.updateConveyorDOM();

        // Добавляем дорожку в контейнер
        conveyorContainer.appendChild(conveyorTrack);

        // Вставляем контейнер на страницу
        if (frameElement) {
            frameElement.insertAdjacentElement('afterend', conveyorContainer);
        } else {
            this.streakContainer.appendChild(conveyorContainer);
        }

        // Начальная позиция
        this.position = 0;
        if (this.conveyorTrack) {
            this.conveyorTrack.style.transform = 'translate3d(0,0,0)';
        }
    }

    updateConveyorDOM() {
        if (!this.conveyorTrack) return;
        
        // Очищаем существующие элементы
        this.conveyorTrack.innerHTML = '';
        
        // Создаем элементы для всех призов (дублируем для бесшовности)
        const allPrizes = [...this.activePrizes, ...this.activePrizes];
        
        allPrizes.forEach(prize => {
            const conveyorPrize = this.createConveyorPrize(prize.src, prize.className);
            this.conveyorTrack.appendChild(conveyorPrize);
        });
    }
    
    createConveyorPrize(prizeSrc, className) {
        const conveyorPrize = document.createElement('div');
        conveyorPrize.className = 'smooth-prize';
        
        const img = document.createElement('img');
        img.src = prizeSrc;
        img.className = className;
        
        conveyorPrize.appendChild(img);
        
        return conveyorPrize;
    }
    
    startConveyor() {
        this.isActive = true;
        this.lastShuffleTime = Date.now();
        this.animate();
    }
    
    stopConveyor() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    animate() {
        if (!this.isActive) return;
    
        const currentTime = performance.now();
        const deltaTime = currentTime - (this.lastFrameTime || currentTime);
        this.lastFrameTime = currentTime;
    
        this.position -= this.conveyorSpeed * (deltaTime / 16);
    
        const totalWidth = this.activePrizes.length * this.prizeWidth;
    
        if (Math.abs(this.position) >= totalWidth) {
            this.position = 0;
        }
    
        if (this.conveyorTrack) {
            this.conveyorTrack.style.transition = 'none';
            this.conveyorTrack.style.transform = `translate3d(${this.position}px, 0, 0)`;
        }
    
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    shufflePrizes() {
        const shuffled = [...this.activePrizes];
        
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        this.activePrizes = shuffled;
        this.updateConveyorDOM();
    }
    
    getPrizeClass(prizeSrc) {
        if (prizeSrc.includes('low-prize.svg') || 
            prizeSrc.includes('very-low-prize.svg') || 
            prizeSrc.includes('ultra-low-prize.svg')) {
            return 'img-3';
        }
        return 'img-2';
    }
    
    getRandomPrize() {
        return this.prizesPool[Math.floor(Math.random() * this.prizesPool.length)];
    }
    
    pause() {
        this.stopConveyor();
    }
    
    resume() {
        if (!this.isActive) {
            this.startConveyor();
        }
    }
  }

  // Автоматический запуск при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            window.MainSmoothConveyor = new MainSmoothCyclicalConveyor();
        }, 300);
    });
  } else {
    setTimeout(() => {
        window.MainSmoothConveyor = new MainSmoothCyclicalConveyor();
    }, 300);
  }
})();
