// Система управления игроками (реальные + боты)
class PlayersSystem {
    constructor() {
        this.realPlayers = new Map(); // Map<userId, playerData>
        this.fakePlayers = [];
        this.currentGamePlayers = [];
        
        // Генерируем фейковых игроков
        this.generateFakePlayers();
        
        // Добавляем текущего пользователя если есть
        this.addCurrentUser();
    }

    generateFakePlayers() {
        const fakeNames = [
            'Alex', 'Maria', 'John', 'Sarah', 'David', 'Emma', 'Michael', 'Lisa',
            'Daniel', 'Anna', 'Chris', 'Kate', 'Ryan', 'Julia', 'Mark', 'Sophie',
            'Tom', 'Nina', 'Jack', 'Olivia', 'Luke', 'Mia', 'Ben', 'Eva',
            'Sam', 'Zoe', 'Max', 'Lily', 'Nick', 'Amy'
        ];

        const avatarColors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
        ];

        for (let i = 0; i < 30; i++) {
            const name = fakeNames[i % fakeNames.length];
            const maskedName = this.maskName(name);
            
            this.fakePlayers.push({
                id: `bot_${i}`,
                name: name,
                maskedName: maskedName,
                avatar: null,
                avatarColor: avatarColors[i % avatarColors.length],
                isBot: true,
                balance: Math.floor(Math.random() * 5000) + 500
            });
        }
    }

    maskName(name) {
        if (name.length <= 2) return name;
        const first = name[0];
        const last = name[name.length - 1];
        const middle = '*'.repeat(name.length - 2);
        return `${first}${middle}${last}`;
    }

    addCurrentUser() {
        if (window.TelegramUserData) {
            const userData = window.TelegramUserData;
            const player = {
                id: userData.id || 'user_' + Date.now(),
                name: userData.first_name || 'Player',
                maskedName: this.maskName(userData.first_name || 'Player'),
                avatar: userData.photo_url || null,
                avatarColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                isBot: false,
                balance: 1000 // Начальный баланс
            };
            
            this.realPlayers.set(player.id, player);
            console.log('✅ Текущий пользователь добавлен:', player);
        }
    }

    getRandomBots(count) {
        const shuffled = [...this.fakePlayers].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    getAllRealPlayers() {
        return Array.from(this.realPlayers.values());
    }

    getMixedPlayers(totalCount, minRealPlayers = 1) {
        const realPlayers = this.getAllRealPlayers();
        const realCount = Math.min(realPlayers.length, minRealPlayers);
        const botCount = totalCount - realCount;
        
        const bots = this.getRandomBots(botCount);
        const mixed = [...realPlayers.slice(0, realCount), ...bots];
        
        // Перемешиваем
        return mixed.sort(() => Math.random() - 0.5);
    }

    // Для Roll игры - игроки со ставками
    getPlayersForRoll(playerCount = 3) {
        const players = this.getMixedPlayers(playerCount, 1);
        
        return players.map(player => ({
            ...player,
            bet: Math.floor(Math.random() * 500) + 50
        }));
    }

    // Для истории игр (SpeedCash, BlackJack и т.д.)
    getGameHistory(count = 5) {
        const players = this.getMixedPlayers(count, 0);
        
        return players.map(player => ({
            ...player,
            bet: Math.floor(Math.random() * 1000) + 100,
            win: Math.random() > 0.5 ? Math.floor(Math.random() * 2000) + 200 : null,
            isWinner: Math.random() > 0.5
        }));
    }

    // Создание аватара для игрока
    createAvatarElement(player, size = 40) {
        const avatar = document.createElement('div');
        avatar.className = 'avatar-2';
        avatar.style.width = `${size}px`;
        avatar.style.height = `${size}px`;
        avatar.style.borderRadius = '50%';
        avatar.style.overflow = 'hidden';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        
        if (player.avatar) {
            // Реальная аватарка из Telegram
            avatar.style.backgroundImage = `url(${player.avatar})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
        } else {
            // Цветной градиент для ботов
            avatar.style.background = player.avatarColor;
            avatar.style.color = 'white';
            avatar.style.fontSize = `${size * 0.5}px`;
            avatar.style.fontWeight = 'bold';
            avatar.textContent = player.name[0].toUpperCase();
        }
        
        return avatar;
    }

    // Создание элемента игрока для списка
    createPlayerListItem(player, showBet = true, showWin = true) {
        const item = document.createElement('div');
        item.className = player.isWinner ? 'win' : 'default lost';
        item.style.opacity = '1';
        item.style.transition = 'opacity 0.5s, background-color 0.3s';
        
        if (!player.isWinner) {
            item.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            item.style.width = '100%';
        }
        
        item.innerHTML = `
            <div class="acc-inf">
                <div class="avatar-wrapper"></div>
                <div class="n-k"><div class="n-k-2">${player.maskedName}</div></div>
            </div>
            <div class="div-wrapper-2"><div class="text-wrapper-14">${showBet ? player.bet : '-'}</div></div>
            <div class="element-wrapper"><div class="element-3">${showWin && player.win ? player.win : '-'}</div></div>
        `;
        
        // Добавляем аватар
        const avatarWrapper = item.querySelector('.avatar-wrapper');
        const avatar = this.createAvatarElement(player, 32);
        avatarWrapper.appendChild(avatar);
        
        return item;
    }
}

// Глобальный экземпляр
window.PlayersSystem = new PlayersSystem();

// WebSocket клиент для синхронизации с сервером
class GameWebSocket {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentUser = null;
        this.currentRoom = null;
        
        // Настройки сервера
        // Автоматически определяем URL сервера
        this.serverUrl = this.getServerUrl();
        
        this.connect();
    }

    getServerUrl() {
        // Проверяем переменную окружения или используем дефолтные значения
        if (window.GAME_SERVER_URL) {
            return window.GAME_SERVER_URL;
        }
        
        // Для локальной разработки
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        
        // Production: используем тот же домен где открыт фронт
        return window.location.origin;
    }

    connect() {
        try {
            // Подключаемся к Socket.io серверу
            this.socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });

            this.socket.on('connect', () => {
                console.log('✅ WebSocket подключен:', this.socket.id);
                this.connected = true;
                
                // Автоматическая авторизация если есть Telegram данные
                if (window.TelegramUserData) {
                    this.authenticate(window.TelegramUserData);
                }
            });

            this.socket.on('disconnect', () => {
                console.log('❌ WebSocket отключен');
                this.connected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Ошибка подключения:', error.message);
                console.log('💡 Убедитесь что сервер запущен: npm start в папке server/');
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('❌ Ошибка инициализации WebSocket:', error);
        }
    }

    setupEventListeners() {
        // Авторизация
        this.socket.on('auth_success', (data) => {
            this.currentUser = data.user;
            console.log('✅ Авторизация успешна:', this.currentUser.nickname);
            
            // Обновляем PlayersSystem
            if (window.PlayersSystem) {
                window.PlayersSystem.currentUser = this.currentUser;
            }
        });

        this.socket.on('auth_error', (error) => {
            console.error('❌ Ошибка авторизации:', error.message);
        });

        // Онлайн пользователи
        this.socket.on('online_users', (users) => {
            console.log('👥 Онлайн пользователей:', users.length);
            if (window.PlayersSystem) {
                window.PlayersSystem.onlineUsers = users;
            }
        });

        // Комнаты
        this.socket.on('rooms_list', (rooms) => {
            console.log('🏠 Доступных комнат:', rooms.length);
        });

        this.socket.on('room_created', (room) => {
            console.log('✅ Комната создана:', room.name);
            this.currentRoom = room;
        });

        this.socket.on('room_joined', (room) => {
            console.log('✅ Присоединились к комнате:', room.name);
            this.currentRoom = room;
        });

        this.socket.on('player_joined', (data) => {
            console.log('👤 Игрок присоединился:', data.player.nickname);
            if (this.currentRoom) {
                this.currentRoom = data.room;
            }
        });

        this.socket.on('player_left', (data) => {
            console.log('👋 Игрок вышел:', data.userId);
            if (this.currentRoom) {
                this.currentRoom = data.room;
            }
        });

        // Игра
        this.socket.on('game_start', (room) => {
            console.log('🎮 Игра началась!');
            this.currentRoom = room;
        });

        this.socket.on('game_update', (data) => {
            console.log('🔄 Обновление игры от:', data.player.nickname);
        });

        this.socket.on('game_end', (result) => {
            console.log('🏁 Игра завершена! Победитель:', result.winner);
        });

        // Ошибки
        this.socket.on('error', (error) => {
            console.error('❌ Ошибка сервера:', error.message);
            alert(error.message);
        });
    }

    // Авторизация
    authenticate(telegramData) {
        if (!this.socket || !this.connected) {
            console.warn('⚠️ Socket не подключен');
            return;
        }

        this.socket.emit('auth', {
            id: telegramData.id,
            first_name: telegramData.first_name,
            username: telegramData.username,
            photo_url: telegramData.photo_url
        });
    }

    // Получить онлайн пользователей
    getOnlineUsers() {
        if (!this.socket) return;
        this.socket.emit('get_online_users');
    }

    // Получить список комнат
    getRooms() {
        if (!this.socket) return;
        this.socket.emit('get_rooms');
    }

    // Создать комнату
    createRoom(roomData) {
        if (!this.socket) return;
        this.socket.emit('create_room', roomData);
    }

    // Присоединиться к комнате
    joinRoom(roomId) {
        if (!this.socket) return;
        this.socket.emit('join_room', roomId);
    }

    // Покинуть комнату
    leaveRoom(roomId) {
        if (!this.socket) return;
        this.socket.emit('leave_room', roomId);
    }

    // Готов играть
    playerReady(roomId) {
        if (!this.socket) return;
        this.socket.emit('player_ready', roomId);
    }

    // Сделать ход
    makeMove(roomId, move, gameData = {}) {
        if (!this.socket) return;
        this.socket.emit('make_move', { roomId, move, gameData });
    }

    // Подписаться на события
    on(event, callback) {
        if (!this.socket) return;
        this.socket.on(event, callback);
    }

    // Отписаться от событий
    off(event, callback) {
        if (!this.socket) return;
        this.socket.off(event, callback);
    }
}

// Инициализация WebSocket после загрузки страницы
function initializeWebSocket() {
    if (typeof io !== 'undefined') {
        window.GameWebSocket = new GameWebSocket();
        console.log('✅ WebSocket клиент инициализирован');
    } else {
        console.warn('⚠️ Socket.io не загружен. Добавьте <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>');
        window.GameWebSocket = null;
    }
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebSocket);
} else {
    // DOM уже загружен
    initializeWebSocket();
}

console.log('✅ Players System загружена');
