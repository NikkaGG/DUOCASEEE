const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://repomain-nine.vercel.app",
      "http://localhost:*",
      "http://127.0.0.1:*",
      "*"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://telegram.org",
        "https://cdn.socket.io"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "http:",
        "https://raw.githubusercontent.com",
        "https://github.com"
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        "ws:"
      ],
      fontSrc: [
        "'self'", 
        "data:", 
        "https:",
        "https://fonts.gstatic.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json());

// Раздаем статические файлы (фронтенд)
// Пробуем разные пути в зависимости от окружения
const possiblePaths = [
  path.join(__dirname, '..'), // Локально
  '/opt/render/project/src', // Render
  process.cwd(), // Текущая директория
];

let staticPath = possiblePaths[0];
for (const p of possiblePaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    staticPath = p;
    break;
  }
}

console.log('📁 Статические файлы из:', staticPath);
app.use(express.static(staticPath));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов
});
app.use('/api/', limiter);

// MongoDB подключение (опционально)
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI && MONGODB_URI.trim() !== '') {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Таймаут 5 секунд
  })
    .then(() => console.log('✅ MongoDB подключена'))
    .catch(err => {
      console.error('❌ MongoDB ошибка:', err.message);
      console.log('⚠️ Продолжаем работу без MongoDB (используется JSON хранилище)');
    });
} else {
  console.log('⚠️ MongoDB не настроена (работает без БД - используется JSON хранилище)');
}

// Модели (только если MongoDB подключена)
let User, Room, GameHistory;
if (MONGODB_URI && MONGODB_URI.trim() !== '') {
  try {
    User = require('./models/User');
    Room = require('./models/Room');
    GameHistory = require('./models/GameHistory');
  } catch (err) {
    console.error('⚠️ Ошибка загрузки моделей MongoDB:', err.message);
  }
}
// Хранилище активных пользователей и комнат
const onlineUsers = new Map(); // socketId -> userData
const activeRooms = new Map(); // roomId -> roomData
const userSockets = new Map(); // userId -> socketId

// Палитра цветов для игроков
const colors = [
  '#bde0fe', '#ffafcc', '#ade8f4', '#edede9', '#6f2dbd',
  '#b8c0ff', '#ff9e00', '#826aed', '#ffff3f', '#1dd3b0',
  '#ffd449', '#54defd', '#2fe6de', '#00f2f2', '#2d00f7',
  '#00ccf5', '#00f59b', '#7014f2', '#ff00ff', '#ffe017',
  '#44d800', '#ff8c00', '#ff3800', '#fff702', '#00ffff',
  '#00ffe0', '#00ffc0', '#00ffa0', '#00ffff', '#8000ff',
  '#02b3f6'
];

// Хранилище цветов игроков (userId -> color)
const playerColors = new Map();
const usedColors = new Set();

function getPlayerColor(userId) {
  if (!playerColors.has(userId)) {
    // Находим свободный цвет (не используемый другими игроками)
    let availableColors = colors.filter(color => !usedColors.has(color));
    
    // Если все цвета заняты, сбрасываем и начинаем заново
    if (availableColors.length === 0) {
      usedColors.clear();
      availableColors = [...colors];
    }
    
    // Назначаем случайный свободный цвет
    const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    playerColors.set(userId, randomColor);
    console.log(`🎨 Игрок ${userId} получил уникальный цвет ${randomColor}`);
  }
  return playerColors.get(userId);
}

// Глобальные игры (одна игра для всех пользователей)
const globalGames = {
  roll: {
    status: 'waiting', // waiting, betting, spinning
    players: [],
    timer: 30, // 30 секунд
    startTime: null,
    timerInterval: null,
    winner: null,
    totalBet: 0,
    bets: {}
  },
  crash: {
    status: 'waiting', // waiting, flying, crashed
    players: [],
    multiplier: 1.00,
    crashPoint: null,
    startTime: null,
    gameInterval: null,
    waitingTimer: null,
    waitingTime: 5, // 5 секунд ожидания
    isInitialized: false // Флаг инициализации
  }
};

// Персистентное хранилище (JSON файлы)
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Создаем папку data если её нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Создана папка data/');
}

// Загрузка состояния из файлов
function loadPersistedData() {
  try {
    // Загружаем комнаты
    if (fs.existsSync(ROOMS_FILE)) {
      const roomsData = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
      roomsData.forEach(room => {
        room.createdAt = new Date(room.createdAt);
        activeRooms.set(room.id, room);
      });
      console.log(`✅ Загружено ${roomsData.length} комнат из файла`);
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки данных:', error);
  }
}

// Сохранение состояния в файлы
function savePersistedData() {
  try {
    // Сохраняем комнаты
    const roomsData = Array.from(activeRooms.values());
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
  } catch (error) {
    console.error('❌ Ошибка сохранения данных:', error);
  }
}

// Автосохранение каждые 30 секунд
setInterval(savePersistedData, 30000);

// Загружаем данные при старте
loadPersistedData();

// ============ SOCKET.IO EVENTS ============

io.on('connection', (socket) => {
  console.log(`🔌 Новое подключение: ${socket.id}`);

  // Регистрация/авторизация пользователя
  socket.on('auth', async (telegramData) => {
    try {
      const { id, first_name, username, photo_url } = telegramData;
      
      // Находим или создаем пользователя
      let user;
      if (User) {
        user = await User.findOne({ telegramId: id });
        
        if (!user) {
          user = new User({
            telegramId: id,
            firstName: first_name,
            username: username,
            photoUrl: photo_url,
            nickname: first_name || username || `Player${id}`,
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              totalWinnings: 0
            }
          });
          await user.save();
          console.log(`✅ Новый пользователь создан: ${user.nickname}`);
        } else {
          // Обновляем данные
          user.firstName = first_name;
          user.username = username;
          user.photoUrl = photo_url;
          user.lastSeen = new Date();
          await user.save();
        }
      } else {
        // Работаем без БД
        user = {
          _id: id,
          telegramId: id,
          nickname: first_name || username || `Player${id}`,
          photoUrl: photo_url,
          stats: { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 }
        };
      }

      // Сохраняем в онлайн
      onlineUsers.set(socket.id, {
        socketId: socket.id,
        userId: user._id.toString(),
        telegramId: id,
        nickname: user.nickname,
        photoUrl: photo_url,
        isOnline: true
      });
      
      userSockets.set(user._id.toString(), socket.id);

      socket.emit('auth_success', {
        user: {
          id: user._id,
          telegramId: user.telegramId,
          nickname: user.nickname,
          photoUrl: user.photoUrl,
          stats: user.stats
        }
      });

      // Отправляем список онлайн пользователей всем
      io.emit('online_users', Array.from(onlineUsers.values()));
      
      console.log(`✅ Пользователь авторизован: ${user.nickname} (${socket.id})`);
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
      socket.emit('auth_error', { message: 'Ошибка авторизации' });
    }
  });

  // Получить список онлайн пользователей
  socket.on('get_online_users', () => {
    socket.emit('online_users', Array.from(onlineUsers.values()));
  });

  // Получить список комнат
  socket.on('get_rooms', () => {
    const rooms = Array.from(activeRooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      game: room.game,
      players: room.players.length,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      status: room.status
    }));
    socket.emit('rooms_list', rooms);
  });

  // Создать комнату
  socket.on('create_room', async (roomData) => {
    try {
      const user = onlineUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Пользователь не авторизован' });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const room = {
        id: roomId,
        name: roomData.name || `${user.nickname}'s room`,
        game: roomData.game || 'roll',
        hostId: user.userId,
        players: [{
          userId: user.userId,
          socketId: socket.id,
          nickname: user.nickname,
          photoUrl: user.photoUrl,
          isReady: false,
          isHost: true
        }],
        maxPlayers: roomData.maxPlayers || 3,
        isPrivate: roomData.isPrivate || false,
        status: 'waiting', // waiting, playing, finished
        gameState: {},
        createdAt: new Date()
      };

      activeRooms.set(roomId, room);
      socket.join(roomId);
      
      socket.emit('room_created', room);
      io.emit('room_added', {
        id: room.id,
        name: room.name,
        game: room.game,
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        isPrivate: room.isPrivate,
        status: room.status
      });

      console.log(`🏠 Комната создана: ${room.name} (${roomId})`);
    } catch (error) {
      console.error('❌ Ошибка создания комнаты:', error);
      socket.emit('error', { message: 'Ошибка создания комнаты' });
    }
  });

  // Присоединиться к комнате
  socket.on('join_room', (roomId) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!user) {
        socket.emit('error', { message: 'Пользователь не авторизован' });
        return;
      }

      if (!room) {
        socket.emit('error', { message: 'Комната не найдена' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Комната заполнена' });
        return;
      }

      // Проверяем что пользователь еще не в комнате
      const alreadyInRoom = room.players.find(p => p.userId === user.userId);
      if (alreadyInRoom) {
        socket.emit('error', { message: 'Вы уже в этой комнате' });
        return;
      }

      room.players.push({
        userId: user.userId,
        socketId: socket.id,
        nickname: user.nickname,
        photoUrl: user.photoUrl,
        isReady: false,
        isHost: false
      });

      socket.join(roomId);
      
      // Уведомляем всех в комнате
      io.to(roomId).emit('player_joined', {
        player: {
          userId: user.userId,
          nickname: user.nickname,
          photoUrl: user.photoUrl
        },
        room: room
      });

      socket.emit('room_joined', room);
      
      console.log(`👤 ${user.nickname} присоединился к комнате ${room.name}`);
    } catch (error) {
      console.error('❌ Ошибка присоединения к комнате:', error);
      socket.emit('error', { message: 'Ошибка присоединения к комнате' });
    }
  });

  // Покинуть комнату
  socket.on('leave_room', (roomId) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!room) return;

      room.players = room.players.filter(p => p.socketId !== socket.id);
      socket.leave(roomId);

      if (room.players.length === 0) {
        // Удаляем пустую комнату
        activeRooms.delete(roomId);
        io.emit('room_removed', roomId);
        console.log(`🗑️ Комната удалена: ${room.name}`);
      } else {
        // Назначаем нового хоста если нужно
        if (user && room.hostId === user.userId) {
          room.hostId = room.players[0].userId;
          room.players[0].isHost = true;
        }
        
        io.to(roomId).emit('player_left', {
          userId: user?.userId,
          room: room
        });
      }

      console.log(`👋 ${user?.nickname} покинул комнату`);
    } catch (error) {
      console.error('❌ Ошибка выхода из комнаты:', error);
    }
  });

  // Игрок готов
  socket.on('player_ready', (roomId) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(roomId).emit('room_update', room);
        
        // Проверяем все ли готовы
        const allReady = room.players.every(p => p.isReady);
        if (allReady && room.players.length >= 2) {
          room.status = 'playing';
          io.to(roomId).emit('game_start', room);
          console.log(`🎮 Игра началась в комнате ${room.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка готовности игрока:', error);
    }
  });

  // Сделать ход в игре
  socket.on('make_move', async ({ roomId, move, gameData }) => {
    try {
      const user = onlineUsers.get(socket.id);
      const room = activeRooms.get(roomId);

      if (!room || !user) return;

      // Валидация хода (специфично для каждой игры)
      const isValidMove = validateMove(room.game, room.gameState, move, user.userId);
      
      if (!isValidMove) {
        socket.emit('invalid_move', { message: 'Недопустимый ход' });
        return;
      }

      // Обновляем состояние игры
      room.gameState = updateGameState(room.game, room.gameState, move, user.userId, gameData);
      
      // Отправляем обновление всем в комнате
      io.to(roomId).emit('game_update', {
        gameState: room.gameState,
        move: move,
        player: {
          userId: user.userId,
          nickname: user.nickname
        }
      });

      // Проверяем окончание игры
      const gameResult = checkGameEnd(room.game, room.gameState);
      if (gameResult.isFinished) {
        room.status = 'finished';
        
        // Сохраняем историю
        await saveGameHistory(room, gameResult);
        
        io.to(roomId).emit('game_end', {
          winner: gameResult.winner,
          results: gameResult.results
        });
        console.log(`🏁 Игра завершена в комнате ${room.name}`);
      }
    } catch (error) {
      console.error('❌ Ошибка хода:', error);
      socket.emit('error', { message: 'Ошибка обработки хода' });
    }
  });

  // Подключение к глобальной игре
  socket.on('join_game', ({ game }) => {
    socket.join(`global_${game}`);
    console.log(`🎮 Подключение к global_${game}`);
    
    const gameState = globalGames[game];
    if (gameState) {
      // Отправляем текущее состояние игры
      socket.emit('game_state_sync', {
        status: gameState.status,
        players: gameState.players.map(p => ({
          userId: p.userId,
          nickname: p.nickname,
          photoUrl: p.photoUrl,
          bet: p.bet,
          color: p.color
        })),
        startTime: gameState.startTime
      });
      
      // Crash: отправляем текущее состояние БЕЗ ЗАДЕРЖКИ
      if (game === 'crash') {
        if (!gameState.isInitialized) {
          // Первый запуск - сразу стартуем
          gameState.isInitialized = true;
          console.log('🚀 Crash: Первая инициализация');
          startCrashWaiting();
        } else if (gameState.status === 'waiting' && gameState.waitingTimer) {
          // Отправляем текущее время таймера СРАЗУ
          socket.emit('crash_waiting', {
            timeLeft: gameState.waitingTime
          });
          console.log(`⚡ Crash: Таймер ${gameState.waitingTime}`);
        } else if (gameState.status === 'flying' && gameState.gameInterval) {
          // Отправляем текущий множитель СРАЗУ
          socket.emit('crash_started', {
            startTime: gameState.startTime.toISOString()
          });
          socket.emit('crash_multiplier', {
            multiplier: parseFloat(gameState.multiplier.toFixed(2))
          });
          console.log(`⚡ Crash: Множитель ${gameState.multiplier.toFixed(2)}x`);
        }
      }
    }
  });

  // Получить состояние игры
  socket.on('get_game_state', ({ game }) => {
    // Отправляем чистую копию без циклических ссылок + ЦВЕТ
    const cleanState = {
      status: globalGames[game].status,
      players: globalGames[game].players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        photoUrl: p.photoUrl,
        bet: p.bet,
        color: p.color // ДОБАВЛЯЕМ ЦВЕТ
      })),
      timer: globalGames[game].timer,
      startTime: globalGames[game].startTime ? globalGames[game].startTime.toISOString() : null
    };
    socket.emit('game_state_sync', cleanState);
  });

  // Сделать ставку в глобальной игре
  socket.on('place_bet', async ({ game, userId, nickname, photoUrl, bet }) => {
    console.log(`📥 Получена ставка:`, { game, userId, nickname, bet });
    
    const gameState = globalGames[game];
    
    if (!gameState) {
      console.error(`❌ Игра ${game} не найдена`);
      return;
    }
    
    // Добавляем/обновляем игрока (только чистые данные)
    const existingPlayer = gameState.players.find(p => p.userId === userId);
    const playerColor = getPlayerColor(userId); // Получаем постоянный цвет
    
    if (existingPlayer) {
      existingPlayer.bet += bet;
      console.log(`➕ Обновлена ставка игрока ${nickname}: ${existingPlayer.bet}`);
    } else {
      // Создаем чистый объект игрока без циклических ссылок
      const cleanPlayer = {
        userId: userId,
        nickname: nickname,
        photoUrl: photoUrl || null,
        bet: bet,
        color: playerColor // Добавляем цвет
      };
      gameState.players.push(cleanPlayer);
      console.log(`✅ Добавлен новый игрок ${nickname} со ставкой ${bet}, цвет: ${playerColor}`);
    }

    // Отправляем всем в комнате (только чистые данные + цвет)
    io.to(`global_${game}`).emit('player_bet', { 
      userId: userId, 
      nickname: nickname, 
      photoUrl: photoUrl || null, 
      bet: bet,
      color: playerColor // Цвет доступен в обоих случаях
    });
    console.log(`📤 Отправлено обновление всем в global_${game}, игроков: ${gameState.players.length}`);

    // Запуск в зависимости от игры
    if (game === 'roll') {
      // Roll: минимум 2 игрока
      if (gameState.status === 'waiting' && gameState.players.length >= 2) {
        console.log(`🎮 Запускаем Roll`);
        startGlobalGame(game);
      } else if (gameState.status === 'waiting' && gameState.players.length === 1) {
        console.log(`⏳ Roll: Ожидание второго игрока...`);
      }
    } else if (game === 'crash') {
      // Crash: автозапуск всегда (не требуется ставок)
      // Логика автозапуска в crashCrashGame()
    }
  });

  // Запуск глобальной игры
  function startGlobalGame(game) {
    const gameState = globalGames[game];
    gameState.status = 'betting';
    gameState.startTime = new Date();
    
    // Отправляем чистые данные без циклических ссылок
    io.to(`global_${game}`).emit('game_started', {
      startTime: gameState.startTime.toISOString(), // Конвертируем Date в строку
      timer: gameState.timer
    });

    console.log(`🎮 Глобальная игра ${game} началась! Таймер: ${gameState.timer}с`);

    // Таймер
    gameState.timerInterval = setTimeout(() => {
      spinGlobalGame(game);
    }, gameState.timer * 1000);
  }

  // Крутим колесо
  function spinGlobalGame(game) {
    const gameState = globalGames[game];
    
    console.log(`🎰 spinGlobalGame вызван для ${game}, игроков: ${gameState.players.length}`);
    
    if (gameState.players.length === 0) {
      console.log(`⚠️ Нет игроков, сброс игры`);
      gameState.status = 'waiting';
      return;
    }

    // Выбираем победителя по весам
    const totalBets = gameState.players.reduce((sum, p) => sum + p.bet, 0);
    const random = Math.random() * totalBets;
    let sum = 0;
    let winner = gameState.players[0];

    for (const player of gameState.players) {
      sum += player.bet;
      if (random <= sum) {
        winner = player;
        break;
      }
    }

    console.log(`🏆 Победитель в ${game}: ${winner.nickname} (userId: ${winner.userId})`);
    
    // Сохраняем победителя в состоянии
    gameState.status = 'spinning';
    gameState.winner = winner.userId;

    io.to(`global_${game}`).emit('spin_wheel', { winner: winner.userId });
    console.log(`📤 Отправлено событие spin_wheel в комнату global_${game} с winnerId: ${winner.userId}`);
    console.log(`📊 Клиентов в комнате global_${game}:`, io.sockets.adapter.rooms.get(`global_${game}`)?.size || 0);

    // Завершаем игру через 5 секунд
    setTimeout(() => {
      io.to(`global_${game}`).emit('game_finished', { winner: winner.userId });
      
      // Сбрасываем состояние
      gameState.status = 'waiting';
      gameState.players = [];
      gameState.startTime = null;
      
      console.log(`🏁 Глобальная игра ${game} завершена`);
    }, 5000);
  }

  // ============ CRASH GAME ============
  
  // Запуск Crash (таймер ожидания)
  function startCrashWaiting() {
    const gameState = globalGames.crash;
    gameState.status = 'waiting';
    gameState.waitingTime = 5;
    
    console.log('⏳ Crash: Таймер ожидания 5 секунд...');
    
    // Очищаем старый таймер
    if (gameState.waitingTimer) {
      clearInterval(gameState.waitingTimer);
      gameState.waitingTimer = null;
    }
    
    // Отправляем начальное значение
    io.to('global_crash').emit('crash_waiting', {
      timeLeft: 5
    });
    
    // Таймер обратного отсчета
    gameState.waitingTimer = setInterval(() => {
      gameState.waitingTime--;
      
      io.to('global_crash').emit('crash_waiting', {
        timeLeft: gameState.waitingTime
      });
      
      if (gameState.waitingTime <= 0) {
        clearInterval(gameState.waitingTimer);
        gameState.waitingTimer = null;
        startCrashGame();
      }
    }, 1000);
  }
  
  // Запуск Crash игры
  function startCrashGame() {
    const gameState = globalGames.crash;
    gameState.status = 'flying';
    gameState.startTime = new Date();
    gameState.multiplier = 1.00;
    gameState.crashPoint = (Math.random() * 9 + 1).toFixed(2);
    
    io.to('global_crash').emit('crash_started', {
      startTime: gameState.startTime.toISOString()
    });
    
    console.log(`🚀 Crash начался! Краш на: ${gameState.crashPoint}x`);
    
    // Увеличиваем множитель каждые 100мс (ускоряется с ростом)
    gameState.gameInterval = setInterval(() => {
      // Ускоряем рост по мере увеличения
      let increment = 0.01;
      if (gameState.multiplier > 2) increment = 0.02;
      if (gameState.multiplier > 5) increment = 0.05;
      if (gameState.multiplier > 10) increment = 0.1;
      
      gameState.multiplier += increment;
      
      io.to('global_crash').emit('crash_multiplier', {
        multiplier: parseFloat(gameState.multiplier.toFixed(2))
      });
      
      // Проверяем краш
      if (gameState.multiplier >= parseFloat(gameState.crashPoint)) {
        crashCrashGame();
      }
    }, 100);
  }
  
  // Краш
  function crashCrashGame() {
    const gameState = globalGames.crash;
    
    if (gameState.gameInterval) {
      clearInterval(gameState.gameInterval);
    }
    
    gameState.status = 'crashed';
    
    io.to('global_crash').emit('crash_ended', {
      crashPoint: parseFloat(gameState.crashPoint)
    });
    
    console.log(`💥 Crash упал на: ${gameState.crashPoint}x`);
    
    // Сброс через 3 секунды
    setTimeout(() => {
      gameState.players = [];
      gameState.multiplier = 1.00;
      gameState.status = 'waiting';
      
      io.to('global_crash').emit('game_state_sync', {
        status: 'waiting',
        players: [],
        multiplier: 1.00,
        crashPoint: null
      });
      
      console.log('🔄 Crash сброшен');
      
      // Автозапуск ВСЕГДА (не зависит от игроков)
      setTimeout(() => {
        startCrashWaiting();
      }, 1000);
    }, 3000);
  }
  
  // Cashout
  socket.on('crash_cashout', ({ game, userId }) => {
    const gameState = globalGames.crash;
    
    if (gameState.status !== 'flying') return;
    
    const player = gameState.players.find(p => p.userId === userId);
    if (!player || player.cashout) return;
    
    const cashout = Math.floor(player.bet * gameState.multiplier);
    player.cashout = cashout;
    player.multiplier = gameState.multiplier;
    
    io.to('global_crash').emit('player_cashout', {
      userId: userId,
      cashout: cashout,
      multiplier: gameState.multiplier
    });
    
    console.log(`💵 ${player.nickname} забрал ${cashout} на ${gameState.multiplier.toFixed(2)}x`);
  });

  // Отключение
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    
    if (user) {
      // Удаляем из всех комнат
      activeRooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          
          if (room.players.length === 0) {
            activeRooms.delete(roomId);
            io.emit('room_removed', roomId);
          } else {
            io.to(roomId).emit('player_left', {
              userId: user.userId,
              room: room
            });
          }
        }
      });

      onlineUsers.delete(socket.id);
      userSockets.delete(user.userId);
      
      io.emit('online_users', Array.from(onlineUsers.values()));
      console.log(`❌ Отключение: ${user.nickname} (${socket.id})`);
    }
  });
});

// ============ HELPER FUNCTIONS ============

function validateMove(game, gameState, move, userId) {
  // TODO: Реализовать валидацию для каждой игры
  return true;
}

function updateGameState(game, gameState, move, userId, gameData) {
  // TODO: Обновление состояния для каждой игры
  if (!gameState.moves) gameState.moves = [];
  gameState.moves.push({ userId, move, timestamp: new Date(), ...gameData });
  return gameState;
}

function checkGameEnd(game, gameState) {
  // TODO: Проверка окончания для каждой игры
  return { isFinished: false, winner: null, results: {} };
}

async function saveGameHistory(room, gameResult) {
  try {
    const historyEntry = {
      roomId: room.id,
      game: room.game,
      players: room.players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        bet: gameResult.bets?.[p.userId] || 0,
        winnings: gameResult.winnings?.[p.userId] || 0,
        isWinner: gameResult.winner === p.userId
      })),
      winner: gameResult.winner,
      gameState: room.gameState,
      duration: Date.now() - room.createdAt.getTime(),
      createdAt: new Date()
    };

    // Сохраняем в MongoDB если доступна
    if (GameHistory) {
      const history = new GameHistory(historyEntry);
      await history.save();
      console.log('✅ История сохранена в MongoDB');
    } else {
      // Fallback: сохраняем в JSON файл
      let historyData = [];
      if (fs.existsSync(HISTORY_FILE)) {
        historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      }
      historyData.push(historyEntry);
      
      // Храним только последние 1000 записей
      if (historyData.length > 1000) {
        historyData = historyData.slice(-1000);
      }
      
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2));
      console.log('✅ История сохранена в JSON файл');
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения истории:', error);
  }
}

// ============ REST API ============

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/stats', async (req, res) => {
  try {
    let totalUsers = 0;
    let totalGames = 0;

    if (User && GameHistory) {
      totalUsers = await User.countDocuments();
      totalGames = await GameHistory.countDocuments();
    } else {
      // Читаем из JSON файлов
      if (fs.existsSync(HISTORY_FILE)) {
        const historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        totalGames = historyData.length;
      }
    }
    
    res.json({
      totalUsers,
      totalGames,
      onlineUsers: onlineUsers.size,
      activeRooms: activeRooms.size,
      usingMongoDB: !!User
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/history', (req, res) => {
  try {
    let historyData = [];
    
    if (fs.existsSync(HISTORY_FILE)) {
      historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
    
    // Возвращаем последние 50 игр
    res.json(historyData.slice(-50).reverse());
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 WebSocket готов к подключениям`);
  console.log(`💾 Персистентное хранилище: ${DATA_DIR}`);
  console.log(`🗄️ MongoDB: ${MONGODB_URI && MONGODB_URI.trim() !== '' ? 'Настроена' : 'Отключена (используется JSON)'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Получен сигнал остановки...');
  savePersistedData();
  console.log('✅ Данные сохранены');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Получен сигнал завершения...');
  savePersistedData();
  console.log('✅ Данные сохранены');
  process.exit(0);
});
