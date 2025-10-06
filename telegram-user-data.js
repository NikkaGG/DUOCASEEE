// Telegram User Data Loader
class TelegramUserData {
    constructor() {
        this.userData = null;
        this.maxNicknameLength = 12; // Максимальная длина ника с троеточием
        // Не вызываем init() здесь, это будет сделано после создания экземпляра
    }

    init() {
        // Ждем загрузки Telegram WebApp API
        if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
            this.loadUserData();
        } else {
            // Ждем загрузки API с задержкой
            setTimeout(() => {
                if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
                    this.loadUserData();
                } else {
                    this.setTestData();
                }
            }, 1000);
        }
    }

    loadUserData() {
        try {
            const tg = window.Telegram.WebApp;
            
            // Пробуем разные способы получения данных пользователя
            let user = null;
            
            // Способ 1: initDataUnsafe
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                user = tg.initDataUnsafe.user;
            }
            
            // Способ 2: initData (если первый не сработал)
            if (!user && tg.initData) {
                try {
                    const initData = new URLSearchParams(tg.initData);
                    const userData = initData.get('user');
                    if (userData) {
                        user = JSON.parse(decodeURIComponent(userData));
                    } else {
                        // параметр user отсутствует, оставляем user = null
                    }
                } catch (e) {
                    // initData не содержит корректный JSON пользователя
                }
            }
            
            // Способ 3: Прямой доступ к tg.user (если есть)
            if (!user && tg.user) {
                user = tg.user;
            }
            
            // Способ 4: Пробуем получить из URL параметров
            if (!user) {
                const urlParams = new URLSearchParams(window.location.search);
                const userParam = urlParams.get('user');
                if (userParam) {
                    try {
                        user = JSON.parse(decodeURIComponent(userParam));
                    } catch (e) {
                        // некорректный JSON в параметре user
                    }
                }
            }
            
            // Способ 5: Пробуем получить из hash
            if (!user && window.location.hash) {
                try {
                    const hashData = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
                    if (hashData.user) {
                        user = hashData.user;
                    }
                } catch (e) {
                    // некорректный JSON в hash
                }
            }
            
            if (user) {
                this.userData = {
                    id: user.id,
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    username: user.username || '',
                    photoUrl: user.photo_url || '',
                    isPremium: user.is_premium || false
                };
                this.updateUI();
            } else {
                this.setTestData();
            }
        } catch (error) {
            this.setTestData();
        }
    }

    setTestData() {
        this.userData = {
            id: 123456789,
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            photoUrl: '',
            isPremium: false
        };
        this.updateUI();
    }

    getDisplayName() {
        if (!this.userData) return 'Loading...';
        
        let displayName = this.userData.firstName;
        if (this.userData.lastName) {
            displayName += ' ' + this.userData.lastName;
        }
        
        // Обрезаем длинные имена
        if (displayName.length > this.maxNicknameLength) {
            displayName = displayName.substring(0, this.maxNicknameLength - 3) + '...';
        }
        
        return displayName;
    }

    getUserId() {
        return this.userData ? this.userData.id : null;
    }

    getUsername() {
        return this.userData ? this.userData.username : '';
    }

    getPhotoUrl() {
        return this.userData ? this.userData.photoUrl : '';
    }

    updateUI() {
        const displayName = this.getDisplayName();
        
        // Создаем глобальный объект для совместимости
        window.TelegramUserData = {
            id: this.getUserId(),
            first_name: this.userData?.firstName || '',
            last_name: this.userData?.lastName || '',
            username: this.userData?.username || '',
            photo_url: this.getPhotoUrl(),
            is_premium: this.userData?.isPremium || false
        };
        
        // Обновляем все блоки account-info
        const accountInfoBlocks = document.querySelectorAll('.account-info');
        accountInfoBlocks.forEach(block => {
            const nicknameElement = block.querySelector('.nickname .text-wrapper');
            if (nicknameElement) {
                nicknameElement.textContent = displayName;
            }
            
            const avatarElement = block.querySelector('.avatar');
            if (avatarElement && this.getPhotoUrl()) {
                avatarElement.style.backgroundImage = `url(${this.getPhotoUrl()})`;
                avatarElement.style.backgroundSize = 'cover';
                avatarElement.style.backgroundPosition = 'center';
            }
        });

        // Обновляем все блоки acc-info
        const accInfoBlocks = document.querySelectorAll('.acc-info');
        accInfoBlocks.forEach(block => {
            const nickElement = block.querySelector('.nick .text-wrapper');
            if (nickElement) {
                nickElement.textContent = this.getDisplayName();
            }
            
            const idElement = block.querySelector('.element .div');
            if (idElement) {
                idElement.textContent = `#${this.getUserId()}`;
            }
            
            const avatarElement = block.querySelector('.avatar');
            if (avatarElement && this.getPhotoUrl()) {
                avatarElement.style.backgroundImage = `url(${this.getPhotoUrl()})`;
                avatarElement.style.backgroundSize = 'cover';
                avatarElement.style.backgroundPosition = 'center';
            }
        });

        // Обновляем другие варианты блоков с никнеймами
        const devBlocks = document.querySelectorAll('.dev .text-wrapper');
        devBlocks.forEach(block => {
            block.textContent = this.getDisplayName();
        });

        // Обновляем аватары в списках игроков
        const playerAvatars = document.querySelectorAll('.acc-inf .avatar-2, .acc-inf .avatar-3, .acc-inf .avatar-4');
        playerAvatars.forEach(avatar => {
            if (this.getPhotoUrl()) {
                avatar.style.backgroundImage = `url(${this.getPhotoUrl()})`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
            }
        });

        // Обновляем никнеймы в списках игроков (маскируем для приватности)
        const playerNicks = document.querySelectorAll('.acc-inf .text-wrapper-22, .acc-inf .text-wrapper-26, .acc-inf .text-wrapper-37, .acc-inf .text-wrapper-40');
        playerNicks.forEach(nick => {
            const displayName = this.getDisplayName();
            if (displayName.length > 3) {
                const maskedName = displayName.charAt(0) + '***' + displayName.charAt(displayName.length - 1);
                nick.textContent = maskedName;
            }
        });
    }

    refresh() {
        this.loadUserData();
    }
}

// Ждем загрузки Telegram API перед созданием экземпляра
function initTelegramUser() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        window.TelegramUser = new TelegramUserData();
        window.TelegramUser.init(); // Вызываем init после создания
    } else {
        // Если API еще не загружен, ждем
        setTimeout(initTelegramUser, 100);
    }
}

// Запускаем инициализацию
initTelegramUser();

document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram WebApp если доступен
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
    }
    
    // Ждем создания экземпляра TelegramUser
    const checkTelegramUser = () => {
        if (window.TelegramUser) {
            window.TelegramUser.updateUI();
        } else {
            setTimeout(checkTelegramUser, 100);
        }
    };
    
    checkTelegramUser();
});

// Дополнительная проверка через 3 секунды
setTimeout(() => {
    if (window.TelegramUser) {
        if (!window.TelegramUser.getUserId() || window.TelegramUser.getUserId() === 123456789) {
            window.TelegramUser.refresh();
        }
    }
}, 3000);
