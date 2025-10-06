// Конфигурация для подключения к серверу
(function() {
    // Определяем URL сервера в зависимости от окружения
    
    // Для локальной разработки
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.GAME_SERVER_URL = 'http://localhost:3000';
    }
    // Для продакшена на Render
    else if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app')) {
        // Укажите здесь URL вашего сервера на Render
        window.GAME_SERVER_URL = 'https://telegram-games-plkj.onrender.com';
    }
    // Для других доменов - используем тот же origin
    else {
        window.GAME_SERVER_URL = window.location.origin;
    }
    
    console.log('🔧 Сервер настроен:', window.GAME_SERVER_URL);
})();
