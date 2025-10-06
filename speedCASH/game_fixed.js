class SpeedCashGame {
    constructor() {
        this.gameState = 'waiting'; // 'waiting', 'betting', 'racing', 'finished'
        this.blueBet = 50;
        this.orangeBet = 50;
        this.currentBlueBet = null;
        this.currentOrangeBet = null;
        this.queuedBlueBet = null;
        this.queuedOrangeBet = null;
        
        // Single mode
        this.singleBet = 50;
        this.currentSingleBet = null;
        this.queuedSingleBet = null;
        this.singleSelectedCar = 'blue'; // 'blue' или 'orange'
        
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.raceStartTime = null;
        this.raceDuration = 20000; // 20 seconds race
        this.animationId = null;
        this.roadAnimationId = null;
        this.winner = null;
        this.balance = 1000; // Starting balance (displayed in HTML)
        this.bettingTimer = null;
        this.bettingTimeLeft = 5; // 5 seconds to bet
        this.delayedCar = null; // Only one car gets delayed
        this.blueStopMultiplier = 2 + Math.random() * 6; // Random stop point 2-8x
        this.orangeStopMultiplier = 2 + Math.random() * 6; // Random stop point 2-8x
        this.bluePosition = 0;
        this.orangePosition = 0;
        this.gameEnded = false;
        this.blueEscaped = false;
        this.orangeEscaped = false;
        this.escapeTextShown = false;
        this.racingPhase = false;
        
        // Auto Cash Out
        this.blueAutoCashOutEnabled = false;
        this.orangeAutoCashOutEnabled = false;
        this.blueAutoCashOutMultiplier = 2.00;
        this.orangeAutoCashOutMultiplier = 2.00;
        
        this.initializeElements();
        this.createRoadLines();
        // Balance update removed - using static HTML value
        this.startBettingPhase();
    }

    initializeElements() {
        // Bet buttons
        this.blueBetButton = document.querySelector('.div-4:first-child .bet-button');
        this.orangeBetButton = document.querySelector('.div-4:last-child .cash-out-button');
        
        // Amount displays
        this.blueBetAmount = document.querySelector('.div-4:first-child .text-wrapper-13');
        this.orangeBetAmount = document.querySelector('.div-4:last-child .text-wrapper-13');
        
        // Multiplier displays
        this.blueMultiplierDisplay = document.querySelector('.text-wrapper-4');
        this.orangeMultiplierDisplay = document.querySelector('.text-wrapper-5');
        
        // Car elements
        this.blueCar = document.querySelector('.auto-blue-2');
        this.orangeCar = document.querySelector('.auto-orange');
        
        // Balance display removed - using static HTML value
        
        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.blueBetButton) {
            this.blueBetButton.addEventListener('click', () => this.placeBet('blue'));
        }
        if (this.orangeBetButton) {
            this.orangeBetButton.addEventListener('click', () => this.placeBet('orange'));
        }
        
        // Single mode button
        const singleButton = document.querySelector('.who-is-win .bet-button');
        if (singleButton) {
            singleButton.addEventListener('click', () => this.placeBet('single'));
        }
    }

    createRoadLines() {
        const roadContainer = document.getElementById('roadLines');
        if (!roadContainer) return;
        
        // Clear existing lines
        roadContainer.innerHTML = '';
        
        // Create proper dashed road markings with unique IDs
        for (let i = 0; i < 15; i++) {
            const line = document.createElement('div');
            line.className = 'road-line';
            line.id = `road-line-${i}`;
            line.style.top = `${i * 80 - 400}px`; // Больше расстояние между линиями
            roadContainer.appendChild(line);
        }
    }
    
    animateRoadLines() {
        const roadContainer = document.getElementById('roadLines');
        if (!roadContainer) return;
        
        const animateLines = () => {
            if (this.gameState !== 'racing') return;
            
            const lines = roadContainer.querySelectorAll('.road-line');
            lines.forEach(line => {
                let currentTop = parseInt(line.style.top) || 0;
                currentTop += 3; // Плавное движение
                
                // Когда линия уходит за экран, возвращаем её наверх
                if (currentTop > 700) {
                    currentTop = -400;
                }
                
                line.style.top = `${currentTop}px`;
            });
            
            this.roadAnimationId = requestAnimationFrame(animateLines);
        };
        
        animateLines();
    }

    startBettingPhase() {
        this.gameState = 'betting';
        this.bettingTimeLeft = 5;
        
        // Обрабатываем ставки из очереди
        this.processQueuedBets();
        
        // Hide game elements and show countdown mode
        const raceArea = document.querySelector('.race');
        if (raceArea) {
            raceArea.classList.add('countdown-mode');
            raceArea.classList.remove('game-active');
        }
        
        const roadLines = document.getElementById('roadLines');
        if (roadLines) {
            roadLines.classList.remove('visible');
        }
        
        // Show countdown
        this.showCountdown();
        const countdown = () => {
            if (this.bettingTimeLeft > 0) {
                this.bettingTimeLeft--;
                this.updateCountdown();
                this.bettingTimer = setTimeout(countdown, 1000);
            } else {
                this.hideCountdown();
                this.startRace();
            }
        };
        
        countdown();
    }

    processQueuedBets() {
        // Blue
        if (this.queuedBlueBet) {
            if (window.GameBalanceAPI && window.GameBalanceAPI.canPlaceBet(this.queuedBlueBet, 'chips')) {
                const success = window.GameBalanceAPI.placeBet(this.queuedBlueBet, 'chips');
                if (success) {
                    this.currentBlueBet = this.queuedBlueBet;
                    this.updateBetButton('blue', 'cancel', this.queuedBlueBet);
                    console.log(`✅ Ставка из очереди ${this.queuedBlueBet} чипов на blue принята`);
                }
            }
            this.queuedBlueBet = null;
        }
        
        // Orange
        if (this.queuedOrangeBet) {
            if (window.GameBalanceAPI && window.GameBalanceAPI.canPlaceBet(this.queuedOrangeBet, 'chips')) {
                const success = window.GameBalanceAPI.placeBet(this.queuedOrangeBet, 'chips');
                if (success) {
                    this.currentOrangeBet = this.queuedOrangeBet;
                    this.updateBetButton('orange', 'cancel', this.queuedOrangeBet);
                    console.log(`✅ Ставка из очереди ${this.queuedOrangeBet} чипов на orange принята`);
                }
            }
            this.queuedOrangeBet = null;
        }
        
        // Single
        if (this.queuedSingleBet) {
            if (window.GameBalanceAPI && window.GameBalanceAPI.canPlaceBet(this.queuedSingleBet, 'chips')) {
                const success = window.GameBalanceAPI.placeBet(this.queuedSingleBet, 'chips');
                if (success) {
                    this.currentSingleBet = this.queuedSingleBet;
                    this.updateSingleButton('cancel', this.queuedSingleBet);
                    console.log(`✅ Single ставка из очереди ${this.queuedSingleBet} чипов на ${this.singleSelectedCar} принята`);
                }
            }
            this.queuedSingleBet = null;
        }
    }

    cancelQueuedBet(color) {
        if (color === 'blue') {
            this.queuedBlueBet = null;
        } else {
            this.queuedOrangeBet = null;
        }
        const amount = color === 'blue' ? this.blueBet : this.orangeBet;
        this.updateBetButton(color, 'bet', amount);
        console.log(`❌ Ставка на ${color} из очереди отменена`);
    }

    placeBet(color) {
        // Single mode
        if (color === 'single') {
            return this.placeSingleBet();
        }
        
        const button = this.getButton(color);
        const currentBet = color === 'blue' ? this.currentBlueBet : this.currentOrangeBet;
        
        // Во время betting фазы
        if (this.gameState === 'betting') {
            if (currentBet) {
                // Уже есть ставка - отменяем (Cancel)
                this.cancelBet(color);
            } else {
                // Ставим новую ставку
                const betAmount = color === 'blue' ? this.blueBet : this.orangeBet;
                if (window.GameBalanceAPI && window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
                    const success = window.GameBalanceAPI.placeBet(betAmount, 'chips');
                    if (success) {
                        if (color === 'blue') {
                            this.currentBlueBet = betAmount;
                        } else {
                            this.currentOrangeBet = betAmount;
                        }
                        this.updateBetButton(color, 'cancel', betAmount);
                        console.log(`✅ Ставка ${betAmount} чипов на ${color} принята`);
                    }
                } else {
                    console.log('❌ Недостаточно средств для ставки');
                }
            }
            return;
        }
        
        // Во время racing фазы
        if (this.gameState === 'racing') {
            if (currentBet) {
                // Есть ставка - делаем Cash Out
                this.cashOut(color);
            } else {
                // Нет ставки - ставим в очередь на следующий раунд
                const queuedBet = color === 'blue' ? this.queuedBlueBet : this.queuedOrangeBet;
                if (queuedBet) {
                    // Уже в очереди - отменяем
                    this.cancelQueuedBet(color);
                } else {
                    // Ставим в очередь
                    const betAmount = color === 'blue' ? this.blueBet : this.orangeBet;
                    if (color === 'blue') {
                        this.queuedBlueBet = betAmount;
                    } else {
                        this.queuedOrangeBet = betAmount;
                    }
                    this.updateBetButton(color, 'queued', betAmount);
                    console.log(`⏳ Ставка ${betAmount} чипов на ${color} будет размещена в следующем раунде`);
                }
            }
            return;
        }
    }

    cancelBet(color) {
        const betAmount = color === 'blue' ? this.currentBlueBet : this.currentOrangeBet;
        if (!betAmount) return;
        
        // Возвращаем средства
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(betAmount, 'chips');
        }
        
        // Сбрасываем ставку
        if (color === 'blue') {
            this.currentBlueBet = null;
        } else {
            this.currentOrangeBet = null;
        }
        
        const amount = color === 'blue' ? this.blueBet : this.orangeBet;
        this.updateBetButton(color, 'bet', amount);
        console.log(`❌ Ставка отменена: ${color} - ${betAmount} chips`);
    }

    cashOut(color) {
        const betAmount = color === 'blue' ? this.currentBlueBet : this.currentOrangeBet;
        if (!betAmount) return;
        
        const multiplier = color === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
        const winnings = Math.floor(betAmount * multiplier);
        
        // Выплачиваем выигрыш
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(winnings, 'chips');
        }
        
        // Сбрасываем ставку
        if (color === 'blue') {
            this.currentBlueBet = null;
        } else {
            this.currentOrangeBet = null;
        }
        
        const amount = color === 'blue' ? this.blueBet : this.orangeBet;
        this.updateBetButton(color, 'bet', amount);
        console.log(`💰 ${color} Cash Out: ${winnings} chips (x${multiplier.toFixed(2)})`);
    }

    updateBetButton(color, state, amount) {
        const button = this.getButton(color);
        const wrapper = this.getButtonWrapper(color);
        if (!button) return;
        
        const textElement = button.querySelector('.text-wrapper-9');
        const amountElement = button.querySelector(color === 'blue' ? '.text-wrapper-10' : '.text-wrapper-14');
        
        // Удаляем все классы состояний
        button.classList.remove('state-bet', 'state-cancel', 'state-cashout');
        if (wrapper) {
            wrapper.classList.remove('state-bet', 'state-cancel', 'state-cashout');
        }
        
        // Устанавливаем новое состояние
        if (state === 'bet') {
            if (textElement) textElement.textContent = 'Bet';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-bet');
            if (wrapper) wrapper.classList.add('state-bet');
        } else if (state === 'cancel') {
            if (textElement) textElement.textContent = 'Cancel';
            if (amountElement) amountElement.textContent = '';
            button.classList.add('state-cancel');
            if (wrapper) wrapper.classList.add('state-cancel');
        } else if (state === 'cashout') {
            if (textElement) textElement.textContent = 'Cash Out';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-cashout');
            if (wrapper) wrapper.classList.add('state-cashout');
        } else if (state === 'queued') {
            if (textElement) textElement.textContent = 'Cancel';
            if (amountElement) amountElement.textContent = 'Wait to next round';
            button.classList.add('state-cancel');
            if (wrapper) wrapper.classList.add('state-cancel');
        }
    }
    
    getButton(color) {
        return color === 'blue' 
            ? document.querySelector('.div-4:first-child .bet-button')
            : document.querySelector('.div-4:last-child .cash-out-button');
    }
    
    getButtonWrapper(color) {
        return color === 'blue'
            ? document.querySelector('.div-4:first-child .div-wrapper-3')
            : document.querySelector('.div-4:last-child .div-wrapper-3');
    }

    startRace() {
        this.gameState = 'racing';
        this.raceStartTime = Date.now();
        this.startTime = this.raceStartTime;
        this.racePhaseEndTime = this.raceStartTime + 8000;
        this.gameEnded = false;
        this.blueEscaped = false;
        this.orangeEscaped = false;
        this.escapeTextShown = false;
        this.blueDetained = false;
        this.orangeDetained = false;
        
        // Show game elements
        const raceArea = document.querySelector('.race');
        if (raceArea) {
            raceArea.classList.remove('countdown-mode');
            raceArea.classList.add('game-active');
        }
        
        const roadLines = document.getElementById('roadLines');
        if (roadLines) {
            roadLines.classList.add('visible');
        }
        
        // Reset positions and set initial multipliers
        this.bluePosition = 0;
        this.orangePosition = 0;
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.updateMultiplierDisplays();
        
        // Рандомные иксы для обеих машин (2.0 - 8.0)
        this.blueTargetMultiplier = 2.0 + Math.random() * 6.0;
        this.orangeTargetMultiplier = 2.0 + Math.random() * 6.0;
        
        // Убедимся что иксы разные (минимум 0.3 разницы)
        while (Math.abs(this.blueTargetMultiplier - this.orangeTargetMultiplier) < 0.3) {
            this.orangeTargetMultiplier = 2.0 + Math.random() * 6.0;
        }
        
        // Определяем кто будет задержан
        // 98.5% - одна машина, 1.5% - обе машины
        const bothDetained = Math.random() < 0.015;
        
        if (bothDetained) {
            this.delayedCar = 'both';
            console.log('🚔🚔 Обе машины будут задержаны!');
        } else {
            // Задерживаем ту, у которой меньше множитель
            this.delayedCar = this.blueTargetMultiplier < this.orangeTargetMultiplier ? 'blue' : 'orange';
        }
        
        console.log(`🎲 Blue target: x${this.blueTargetMultiplier.toFixed(2)}, Orange target: x${this.orangeTargetMultiplier.toFixed(2)}`);
        console.log(`🚔 Delayed car: ${this.delayedCar}`);
        
        // Обновляем кнопки на Cash Out если ставки размещены
        if (this.currentBlueBet) {
            this.updateBetButton('blue', 'cashout', this.currentBlueBet);
        }
        if (this.currentOrangeBet) {
            this.updateBetButton('orange', 'cashout', this.currentOrangeBet);
        }
        if (this.currentSingleBet) {
            this.updateSingleButton('cashout', this.currentSingleBet);
        }
        
        // Start animations
        this.animateRace();
        this.animateRoadLines();
    }

    animateRace() {
        if (this.gameState !== 'racing') return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;
        
        // Determine racing phase (first 8 seconds)
        this.racingPhase = currentTime < this.racePhaseEndTime;
        
        // Determine delayed status only AFTER racing phase ends
        const blueDelayed = !this.racingPhase && (this.delayedCar === 'blue' || this.delayedCar === 'both');
        const orangeDelayed = !this.racingPhase && (this.delayedCar === 'orange' || this.delayedCar === 'both');

        // Increment multipliers
        if (!this.gameEnded) {
            const baseIncrease = 0.0003 + Math.random() * 0.0005;

            // Blue множитель
            if (!blueDelayed && !this.blueEscaped && this.blueMultiplier < this.blueTargetMultiplier) {
                this.blueMultiplier += baseIncrease;
                if (this.blueMultiplier >= this.blueTargetMultiplier) {
                    this.blueMultiplier = this.blueTargetMultiplier;
                }
            }

            // Orange множитель
            if (!orangeDelayed && !this.orangeEscaped && this.orangeMultiplier < this.orangeTargetMultiplier) {
                this.orangeMultiplier += baseIncrease;
                if (this.orangeMultiplier >= this.orangeTargetMultiplier) {
                    this.orangeMultiplier = this.orangeTargetMultiplier;
                }
            }
        }
        
        // Update displays
        this.updateMultiplierDisplays();
        
        // Live обновление выигрыша в кнопках
        this.updateLiveWinnings();
        
        // Проверка автокешаута
        this.checkAutoCashOut();
        
        // Хаотичное плавное движение машин
        const blueDelayedAfter = !this.racingPhase && (this.delayedCar === 'blue' || this.delayedCar === 'both');
        const orangeDelayedAfter = !this.racingPhase && (this.delayedCar === 'orange' || this.delayedCar === 'both');
        
        // Blue car movement
        if (blueDelayedAfter && !this.blueEscaped) {
            // Задержанная машина едет вниз полностью
            this.bluePosition += 4;
            if (!this.blueDetained) {
                this.showCrashIcon('blue', this.bluePosition);
                this.blueDetained = true;
            }
        } else if (this.blueEscaped) {
            // Уже уехал - продолжаем движение вверх
            this.bluePosition -= 6;
        } else if (!this.racingPhase && this.blueMultiplier >= this.blueTargetMultiplier && !blueDelayedAfter) {
            // Победитель уезжает вверх когда достиг своего икса
            this.bluePosition -= 6;
            if (this.bluePosition < -400 && !this.escapeTextShown) {
                this.blueEscaped = true;
                this.escapeTextShown = true;
                this.showEscapeText('blue');
            }
        } else if (!blueDelayedAfter) {
            // Хаотичное плавание (только если не задержан)
            const blueWave1 = Math.sin(elapsed * 0.0008) * 25;
            const blueWave2 = Math.cos(elapsed * 0.0013) * 15;
            const blueWave3 = Math.sin(elapsed * 0.0019) * 10;
            const blueTarget = blueWave1 + blueWave2 + blueWave3;
            this.bluePosition += (blueTarget - this.bluePosition) * 0.04;
        }
        
        // Orange car movement (независимое от blue)
        if (orangeDelayedAfter && !this.orangeEscaped) {
            // Задержанная машина едет вниз полностью
            this.orangePosition += 4;
            if (!this.orangeDetained) {
                this.showCrashIcon('orange', this.orangePosition);
                this.orangeDetained = true;
            }
        } else if (this.orangeEscaped) {
            // Уже уехал - продолжаем движение вверх
            this.orangePosition -= 6;
        } else if (!this.racingPhase && this.orangeMultiplier >= this.orangeTargetMultiplier && !orangeDelayedAfter) {
            // Победитель уезжает вверх когда достиг своего икса
            this.orangePosition -= 6;
            if (this.orangePosition < -400 && !this.escapeTextShown) {
                this.orangeEscaped = true;
                this.escapeTextShown = true;
                this.showEscapeText('orange');
            }
        } else if (!orangeDelayedAfter) {
            // Хаотичное плавание (только если не задержан)
            const orangeWave1 = Math.sin(elapsed * 0.0011) * 20;
            const orangeWave2 = Math.cos(elapsed * 0.0017) * 18;
            const orangeWave3 = Math.sin(elapsed * 0.0023) * 12;
            const orangeTarget = orangeWave1 + orangeWave2 + orangeWave3;
            this.orangePosition += (orangeTarget - this.orangePosition) * 0.04;
        }
        
        // Apply movement to cars
        if (this.blueCar) {
            this.blueCar.style.transform = `translateY(${this.bluePosition}px)`;
        }
        if (this.orangeCar) {
            this.orangeCar.style.transform = `translateY(${this.orangePosition}px)`;
        }
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animateRace());
    }

    showCrashIcon(color, carPosition) {
        // Show crash icon only once per car
        const iconId = `crash-icon-${color}`;
        if (document.getElementById(iconId)) return;
        
        const icon = document.createElement('div');
        icon.id = iconId;
        icon.className = 'crash-icon';
        const leftPosition = color === 'blue' ? '25%' : '75%';
        // Фиксированная высота для всех иконок задержания
        icon.style.cssText = `
            position: absolute;
            top: 60%;
            left: ${leftPosition};
            transform: translate(-50%, -50%);
            z-index: 50;
            text-align: center;
        `;
        
        const img = document.createElement('img');
        img.src = color === 'blue'
            ? 'https://github.com/Pacific1a/img/blob/main/speedcash/blue.webp?raw=true'
            : 'https://github.com/Pacific1a/img/blob/main/speedcash/orange.webp?raw=true';
        img.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 8px;
        `;
        
        const text = document.createElement('div');
        text.textContent = 'Задержан';
        text.style.cssText = `
            color: ${color === 'blue' ? '#244eb6' : '#c44c13'};
            font-family: 'Montserrat', Helvetica;
            font-weight: 600;
            font-size: 14px;
            margin-top: 5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        `;
        
        icon.appendChild(img);
        icon.appendChild(text);
        document.querySelector('.game').appendChild(icon);
    }
    
    

    
    
    showEscapeText(color) {
        // Проверяем что хотя бы одна машина уехала
        if (this.delayedCar === 'both') {
            // Если обе задержаны - показываем специальный экран
            console.log('🚫 Обе машины задержаны - игра заканчивается');
            this.showBothDetainedScreen();
            return;
        }
        
        const escapeElement = document.createElement('div');
        escapeElement.className = 'escape-text';
        escapeElement.textContent = 'УЕХАЛ!';
        
        // Position based on which car escaped
        if (color === 'blue') {
            escapeElement.style.left = '25%'; // Left side for blue car
        } else {
            escapeElement.style.left = '75%'; // Right side for orange car
        }
        
        document.querySelector('.race').appendChild(escapeElement);
        
        // Show the text
        setTimeout(() => {
            escapeElement.classList.add('show');
        }, 100);
        
        // Remove after 1.5 seconds and show DROVE AWAY screen
        setTimeout(() => {
            if (escapeElement.parentNode) {
                escapeElement.parentNode.removeChild(escapeElement);
            }
            this.showDroveAwayScreen();
        }, 1500);
    }

    showBothDetainedScreen() {
        // Экран когда обе машины задержаны
        const detainedScreen = document.createElement('div');
        detainedScreen.className = 'drove-away-screen';
        detainedScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, rgb(0, 0, 0) 0%, rgb(15.3, 15.3, 15.3) 100%);
            z-index: 200;
        `;
        
        const detainedText = document.createElement('div');
        detainedText.textContent = 'BOTH DETAINED';
        detainedText.style.cssText = `
            font-size: 17px;
            font-weight: 600;
            color: #ff6b6b;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: droveAwayPulse 1s ease-in-out;
        `;
        
        detainedScreen.appendChild(detainedText);
        document.querySelector('.race').appendChild(detainedScreen);
        
        // Сбрасываем все кнопки в Bet
        this.currentBlueBet = null;
        this.currentOrangeBet = null;
        this.currentSingleBet = null;
        this.updateBetButton('blue', 'bet', this.blueBet);
        this.updateBetButton('orange', 'bet', this.orangeBet);
        this.updateSingleButton('bet', this.singleBet);
        
        // Удаляем через 1.5 секунды и заканчиваем игру
        setTimeout(() => {
            if (detainedScreen.parentNode) {
                detainedScreen.parentNode.removeChild(detainedScreen);
            }
            this.endGame();
        }, 1500);
    }

    showDroveAwayScreen() {
        // Создаем экран DROVE AWAY (как waiting screen)
        const droveAwayScreen = document.createElement('div');
        droveAwayScreen.className = 'drove-away-screen';
        droveAwayScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, rgb(0, 0, 0) 0%, rgb(15.3, 15.3, 15.3) 100%);
            z-index: 200;
        `;
        
        const droveAwayText = document.createElement('div');
        droveAwayText.textContent = 'DROVE AWAY';
        droveAwayText.style.cssText = `
            font-size: 17px;
            font-weight: 600;
            color: white;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: droveAwayPulse 1s ease-in-out;
        `;
        
        droveAwayScreen.appendChild(droveAwayText);
        document.querySelector('.race').appendChild(droveAwayScreen);
        
        // Добавляем CSS анимацию
        if (!document.getElementById('droveAwayAnimation')) {
            const style = document.createElement('style');
            style.id = 'droveAwayAnimation';
            style.textContent = `
                @keyframes droveAwayPulse {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Удаляем через 1 секунду и заканчиваем игру
        setTimeout(() => {
            if (droveAwayScreen.parentNode) {
                droveAwayScreen.parentNode.removeChild(droveAwayScreen);
            }
            this.endGame();
        }, 1000);
    }

    endGame() {
        this.gameState = 'finished';
        this.gameEnded = true;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.roadAnimationId) {
            cancelAnimationFrame(this.roadAnimationId);
        }
        
        // Start smooth transition after escape text is shown
        setTimeout(() => {
            this.startTransition();
        }, 2000);
    }
    
    startTransition() {
        // Добавляем результат в историю
        this.addToHistory(this.blueMultiplier, this.orangeMultiplier);
        
        // Calculate winnings
        let winnings = 0;
        if (this.currentBlueBet && this.blueEscaped) {
            winnings += this.currentBlueBet * this.blueMultiplier;
        }
        if (this.currentOrangeBet && this.orangeEscaped) {
            winnings += this.currentOrangeBet * this.orangeMultiplier;
        }
        
        // Выплачиваем выигрыш через глобальный баланс
        if (winnings > 0 && window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(winnings, 'chips');
            console.log(`Выплачен выигрыш: ${winnings} чипов`);
        }
        
        // Проверяем Single mode выигрыш
        if (this.currentSingleBet) {
            const selectedCarEscaped = (this.singleSelectedCar === 'blue' && this.blueEscaped) || 
                                       (this.singleSelectedCar === 'orange' && this.orangeEscaped);
            
            if (selectedCarEscaped) {
                const multiplier = this.singleSelectedCar === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
                const singleWinnings = Math.floor(this.currentSingleBet * multiplier * 1.5);
                if (window.GameBalanceAPI) {
                    window.GameBalanceAPI.payWinningsAndUpdate(singleWinnings, 'chips');
                    console.log(`🎯 Single выигрыш: ${singleWinnings} chips (x${multiplier.toFixed(2)} × 1.5)`);
                }
            } else {
                console.log(`❌ Single ставка проиграна`);
            }
        }
        
        // Reset bets
        this.currentBlueBet = null;
        this.currentOrangeBet = null;
        this.currentSingleBet = null;
        
        // Reset bet buttons
        this.updateBetButton('blue', 'bet', this.blueBet);
        this.updateBetButton('orange', 'bet', this.orangeBet);
        this.updateSingleButton('bet', this.singleBet);
        
        // Reset multipliers
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.updateMultiplierDisplays();
        
        // Reset car positions СРАЗУ
        if (this.blueCar) {
            this.blueCar.style.transform = 'translateY(0px)';
        }
        if (this.orangeCar) {
            this.orangeCar.style.transform = 'translateY(0px)';
        }
        
        // Clear any crash icons СРАЗУ
        const existingIcons = document.querySelectorAll('.crash-icon');
        existingIcons.forEach(icon => icon.remove());
        
        // СРАЗУ скрываем игровые элементы и показываем countdown
        const raceArea = document.querySelector('.race');
        if (raceArea) {
            raceArea.classList.remove('game-active');
            raceArea.classList.add('countdown-mode');
        }
        
        const roadLines = document.getElementById('roadLines');
        if (roadLines) {
            roadLines.classList.remove('visible');
        }
        
        // Запускаем новую фазу betting БЕЗ задержки
        this.startBettingPhase();
    }

    updateMultiplierDisplays() {
        if (this.blueMultiplierDisplay) {
            this.blueMultiplierDisplay.textContent = `x${this.blueMultiplier.toFixed(2)}`;
        }
        if (this.orangeMultiplierDisplay) {
            this.orangeMultiplierDisplay.textContent = `x${this.orangeMultiplier.toFixed(2)}`;
        }
    }

    updateLiveWinnings() {
        // Blue live winnings
        if (this.currentBlueBet && this.gameState === 'racing') {
            const blueWinnings = Math.floor(this.currentBlueBet * this.blueMultiplier);
            this.updateBetButton('blue', 'cashout', blueWinnings);
        }
        
        // Orange live winnings
        if (this.currentOrangeBet && this.gameState === 'racing') {
            const orangeWinnings = Math.floor(this.currentOrangeBet * this.orangeMultiplier);
            this.updateBetButton('orange', 'cashout', orangeWinnings);
        }
        
        // Single live winnings
        if (this.currentSingleBet && this.gameState === 'racing') {
            const multiplier = this.singleSelectedCar === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
            const singleWinnings = Math.floor(this.currentSingleBet * multiplier * 1.5);
            this.updateSingleButton('cashout', singleWinnings);
        }
    }

    checkAutoCashOut() {
        // Blue auto cash out
        if (this.currentBlueBet && this.blueAutoCashOutEnabled) {
            if (this.blueMultiplier >= this.blueAutoCashOutMultiplier) {
                this.cashOut('blue');
                console.log(`🤖 Blue Auto Cash Out at x${this.blueMultiplier.toFixed(2)}`);
            }
        }
        
        // Orange auto cash out
        if (this.currentOrangeBet && this.orangeAutoCashOutEnabled) {
            if (this.orangeMultiplier >= this.orangeAutoCashOutMultiplier) {
                this.cashOut('orange');
                console.log(`🤖 Orange Auto Cash Out at x${this.orangeMultiplier.toFixed(2)}`);
            }
        }
    }

    showCountdown() {
        // Countdown is handled by the waiting-circle HTML elements
        console.log('Countdown started');
    }
    
    updateCountdown() {
        const countdownText = document.querySelector('.countdown-text');
        if (countdownText) {
            countdownText.textContent = this.bettingTimeLeft;
        }
    }
    
    hideCountdown() {
        const countdownText = document.querySelector('.countdown-text');
        const countdownLabel = document.querySelector('.countdown-label');
        if (countdownText && countdownLabel) {
            countdownText.textContent = 'GO!';
            countdownLabel.textContent = 'ПОЕХАЛИ';
        }
    }

    adjustBetAmount(color, action) {
        // Single mode
        if (color === 'single') {
            const canAdjust = this.gameState === 'betting' || (this.gameState === 'racing' && this.queuedSingleBet);
            if (!canAdjust) return;
            
            if (action === 'half') {
                this.singleBet = Math.max(10, Math.floor(this.singleBet / 2));
            } else if (action === 'double') {
                this.singleBet = this.singleBet * 2;
            } else {
                this.singleBet = Math.max(10, this.singleBet + action);
            }
            
            const singleAmountDisplay = document.querySelector('.who-is-win .text-wrapper-13');
            if (singleAmountDisplay) {
                singleAmountDisplay.textContent = this.singleBet;
            }
            
            if (!this.currentSingleBet && !this.queuedSingleBet) {
                this.updateSingleButton('bet', this.singleBet);
            } else if (this.queuedSingleBet) {
                this.queuedSingleBet = this.singleBet;
                this.updateSingleButton('queued', this.singleBet);
            }
            return;
        }
        
        // Разрешаем изменять ставку во время betting или если есть queued bet во время racing
        const canAdjust = this.gameState === 'betting' || 
                         (this.gameState === 'racing' && 
                          ((color === 'blue' && this.queuedBlueBet) || 
                           (color === 'orange' && this.queuedOrangeBet)));
        
        if (!canAdjust) return;
        
        if (color === 'blue') {
            if (action === 'half') {
                this.blueBet = Math.max(10, Math.floor(this.blueBet / 2));
            } else if (action === 'double') {
                this.blueBet = this.blueBet * 2;
            } else {
                this.blueBet = Math.max(10, this.blueBet + action);
            }
            if (this.blueBetAmount) {
                this.blueBetAmount.textContent = this.blueBet;
            }
            // Обновляем сумму в кнопке если нет активной ставки
            if (!this.currentBlueBet && !this.queuedBlueBet) {
                this.updateBetButton('blue', 'bet', this.blueBet);
            } else if (this.queuedBlueBet) {
                this.queuedBlueBet = this.blueBet;
                this.updateBetButton('blue', 'queued', this.blueBet);
            }
        } else if (color === 'orange') {
            if (action === 'half') {
                this.orangeBet = Math.max(10, Math.floor(this.orangeBet / 2));
            } else if (action === 'double') {
                this.orangeBet = this.orangeBet * 2;
            } else {
                this.orangeBet = Math.max(10, this.orangeBet + action);
            }
            if (this.orangeBetAmount) {
                this.orangeBetAmount.textContent = this.orangeBet;
            }
            // Обновляем сумму в кнопке если нет активной ставки
            if (!this.currentOrangeBet && !this.queuedOrangeBet) {
                this.updateBetButton('orange', 'bet', this.orangeBet);
            } else if (this.queuedOrangeBet) {
                this.queuedOrangeBet = this.orangeBet;
                this.updateBetButton('orange', 'queued', this.orangeBet);
            }
        }
    }

    placeSingleBet() {
        // Во время betting фазы
        if (this.gameState === 'betting') {
            if (this.currentSingleBet) {
                // Отменяем ставку (Cancel)
                this.cancelSingleBet();
            } else {
                // Ставим новую ставку
                if (window.GameBalanceAPI && window.GameBalanceAPI.canPlaceBet(this.singleBet, 'chips')) {
                    const success = window.GameBalanceAPI.placeBet(this.singleBet, 'chips');
                    if (success) {
                        this.currentSingleBet = this.singleBet;
                        this.updateSingleButton('cancel', this.singleBet);
                        console.log(`✅ Single ставка ${this.singleBet} чипов на ${this.singleSelectedCar} принята`);
                    }
                } else {
                    console.log('❌ Недостаточно средств для ставки');
                }
            }
            return;
        }
        
        // Во время racing фазы
        if (this.gameState === 'racing') {
            if (this.currentSingleBet) {
                // Cash Out для Single mode
                this.cashOutSingle();
            } else {
                // Нет ставки - ставим в очередь
                if (this.queuedSingleBet) {
                    this.cancelQueuedSingleBet();
                } else {
                    this.queuedSingleBet = this.singleBet;
                    this.updateSingleButton('queued', this.singleBet);
                    console.log(`⏳ Single ставка ${this.singleBet} на ${this.singleSelectedCar} будет размещена`);
                }
            }
            return;
        }
    }

    cashOutSingle() {
        if (!this.currentSingleBet) return;
        
        const multiplier = this.singleSelectedCar === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
        const winnings = Math.floor(this.currentSingleBet * multiplier * 1.5);
        
        // Выплачиваем выигрыш
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(winnings, 'chips');
        }
        
        this.currentSingleBet = null;
        this.updateSingleButton('bet', this.singleBet);
        console.log(`💰 Single Cash Out: ${winnings} chips (x${multiplier.toFixed(2)} × 1.5)`);
    }

    cancelSingleBet() {
        if (!this.currentSingleBet) return;
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(this.currentSingleBet, 'chips');
        }
        this.currentSingleBet = null;
        this.updateSingleButton('bet', this.singleBet);
        console.log(`❌ Single ставка отменена`);
    }

    cancelQueuedSingleBet() {
        this.queuedSingleBet = null;
        this.updateSingleButton('bet', this.singleBet);
        console.log(`❌ Single ставка из очереди отменена`);
    }

    updateSingleButton(state, amount) {
        const button = document.querySelector('.who-is-win .bet-button');
        if (!button) return;
        
        const textElement = button.querySelector('.text-wrapper-9');
        const amountElement = button.querySelector('.text-wrapper-10');
        
        button.classList.remove('state-bet', 'state-cancel', 'state-cashout');
        
        if (state === 'bet') {
            if (textElement) textElement.textContent = 'Bet';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-bet');
        } else if (state === 'cancel') {
            if (textElement) textElement.textContent = 'Cancel';
            if (amountElement) amountElement.textContent = '';
            button.classList.add('state-cancel');
        } else if (state === 'cashout') {
            if (textElement) textElement.textContent = 'Cash Out';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-cashout');
        } else if (state === 'queued') {
            if (textElement) textElement.textContent = 'Cancel';
            if (amountElement) amountElement.textContent = 'Wait to next round';
            button.classList.add('state-cancel');
        }
    }

    selectSingleCar(car) {
        this.singleSelectedCar = car;
        const blueTab = document.querySelector('.who-is-win .plays .div-wrapper-2:first-child');
        const orangeTab = document.querySelector('.who-is-win .plays .div-wrapper-2:last-child');
        
        if (car === 'blue') {
            if (blueTab) blueTab.innerHTML = '<div class="selected"><div class="text-wrapper-6">Blue</div></div>';
            if (orangeTab) orangeTab.innerHTML = '<div class="not-selected"><div class="text-wrapper-6">Orange</div></div>';
        } else {
            if (blueTab) blueTab.innerHTML = '<div class="not-selected"><div class="text-wrapper-6">Blue</div></div>';
            if (orangeTab) orangeTab.innerHTML = '<div class="selected"><div class="text-wrapper-6">Orange</div></div>';
        }
        console.log(`🎯 Выбрана машина: ${car}`);
    }

    addToHistory(blueMultiplier, orangeMultiplier) {
        const streak = document.querySelector('.streak');
        if (!streak) return;
        
        // Создаем новый элемент истории
        const historyItem = document.createElement('div');
        historyItem.className = 'div-5';
        historyItem.innerHTML = `
            <div class="text-wrapper-15" style="color: #244eb6;">x${blueMultiplier.toFixed(2)}</div>
            <div class="text-wrapper-16" style="color: #c44c14;">x${orangeMultiplier.toFixed(2)}</div>
        `;
        
        // Добавляем в начало
        streak.insertBefore(historyItem, streak.firstChild);
        
        // Оставляем только последние 10 результатов
        while (streak.children.length > 10) {
            streak.removeChild(streak.lastChild);
        }
    }
}

// Global game object
let gameInstance = null;

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    gameInstance = new SpeedCashGame();
    
    // Expose game methods globally
    window.game = {
        adjustBetAmount: (color, action) => gameInstance.adjustBetAmount(color, action),
        placeBet: (color) => gameInstance.placeBet(color),
        selectSingleCar: (car) => gameInstance.selectSingleCar(car),
        toggleAutoCashOut: (color) => gameInstance.toggleAutoCashOut(color),
        switchMode: () => gameInstance.switchMode()
    };
    
    // Setup mode switching
    setupModeSwitching();
    setupAutoCashOut();
});

// Переключение режимов Crash / Single
function setupModeSwitching() {
    const crashTab = document.querySelector('.crash-section-2 .div-wrapper-2:first-child');
    const singleTab = document.querySelector('.crash-section-2 .div-wrapper-2:last-child');
    const betsContainer = document.querySelector('.bets');
    const whoIsWinContainer = document.querySelector('.who-is-win');
    
    if (!crashTab || !singleTab) return;
    
    // Crash mode (по умолчанию)
    crashTab.addEventListener('click', () => {
        // Стили для Crash (selected)
        crashTab.innerHTML = '<div class="selected"><div class="text-wrapper-6">Crash</div></div>';
        // Стили для Single (not-selected)
        singleTab.innerHTML = '<div class="not-selected"><img class="vector" src="https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/speedcash/vector.svg" /></div>';
        
        // Показываем bets, скрываем who-is-win
        if (betsContainer) betsContainer.style.display = 'flex';
        if (whoIsWinContainer) whoIsWinContainer.style.display = 'none';
    });
    
    // Single mode
    singleTab.addEventListener('click', () => {
        // Стили для Single (selected)
        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'selected';
        selectedDiv.style.borderRadius = '13.5px';
        selectedDiv.style.background = 'linear-gradient(90deg, rgba(35, 35, 35, 1) 0%, rgba(46, 46, 46, 1) 100%)';
        selectedDiv.innerHTML = '<img class="vector" src="https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/speedcash/vector.svg" style="filter: brightness(1.5);" />';
        singleTab.innerHTML = '';
        singleTab.appendChild(selectedDiv);
        
        // Стили для Crash (not-selected)
        crashTab.innerHTML = '<div class="not-selected"><div class="text-wrapper-6">Crash</div></div>';
        
        // Скрываем bets, показываем who-is-win
        if (betsContainer) betsContainer.style.display = 'none';
        if (whoIsWinContainer) whoIsWinContainer.style.display = 'flex';
    });
}

// Настройка автокешаута
function setupAutoCashOut() {
    setupAutoCashOutForColor('blue');
    setupAutoCashOutForColor('orange');
}

function setupAutoCashOutForColor(color) {
    const selector = color === 'blue' 
        ? '.div-4:first-child' 
        : '.div-4:last-child';
    
    const container = document.querySelector(selector);
    if (!container) return;
    
    const toggleBtn = container.querySelector('.div-6');
    const multiplierInput = container.querySelector('.text-wrapper-12');
    
    if (!toggleBtn || !multiplierInput) return;
    
    // Изначально выключен
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'pointer';
    let isEnabled = false;
    
    // Переключение вкл/выкл
    toggleBtn.addEventListener('click', () => {
        isEnabled = !isEnabled;
        toggleBtn.style.opacity = isEnabled ? '1' : '0.5';
        
        if (gameInstance) {
            if (color === 'blue') {
                gameInstance.blueAutoCashOutEnabled = isEnabled;
            } else {
                gameInstance.orangeAutoCashOutEnabled = isEnabled;
            }
        }
        
        console.log(`${color} Auto Cash Out: ${isEnabled ? 'ON' : 'OFF'}`);
    });
    
    // Редактирование множителя
    multiplierInput.contentEditable = 'true';
    multiplierInput.style.cursor = 'text';
    
    multiplierInput.addEventListener('focus', (e) => {
        const text = e.target.textContent;
        if (text.startsWith('x')) {
            e.target.textContent = text.substring(1);
        }
        // Выделяем весь текст
        const range = document.createRange();
        range.selectNodeContents(e.target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });
    
    multiplierInput.addEventListener('blur', (e) => {
        let value = parseFloat(e.target.textContent.replace(/[^0-9.]/g, ''));
        if (isNaN(value) || value < 1.01) value = 2.00;
        e.target.textContent = `x${value.toFixed(2)}`;
        
        if (gameInstance) {
            if (color === 'blue') {
                gameInstance.blueAutoCashOutMultiplier = value;
            } else {
                gameInstance.orangeAutoCashOutMultiplier = value;
            }
        }
    });
    
    multiplierInput.addEventListener('keydown', (e) => {
        const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
        if (!allowed.includes(e.key)) {
            e.preventDefault();
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });
    
    multiplierInput.addEventListener('input', (e) => {
        // Запрещаем удалять 'x' в начале
        const text = e.target.textContent;
        if (!text.startsWith('x') && !e.target.matches(':focus')) {
            e.target.textContent = 'x' + text.replace(/[^0-9.]/g, '');
        }
    });
}

