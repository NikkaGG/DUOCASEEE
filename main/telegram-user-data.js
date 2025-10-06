/**
 * Telegram User Data Integration
 * Автоматически заполняет данные пользователя на всех страницах
 */

class TelegramUserData {
    constructor() {
        this.userData = null;
        this.init();
    }

    // Инициализация
    init() {
        // Ждем загрузки Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            this.getUserData();
            this.fillUserData();
        } else {
            // Если Telegram WebApp не загружен, пробуем через параметры URL
            this.getUserDataFromURL();
            this.fillUserData();
        }
    }

    // Получение данных пользователя
    getUserData() {
        const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        const urlParams = this.getUrlParams();

        if (tgUser || urlParams.user_id) {
            this.userData = {
                id: tgUser?.id || urlParams.user_id || 'Unknown',
                firstName: tgUser?.first_name || urlParams.first_name || 'User',
                lastName: tgUser?.last_name || urlParams.last_name || '',
                username: tgUser?.username || urlParams.username || '',
                photoUrl: tgUser?.photo_url || urlParams.photo_url || '',
                languageCode: tgUser?.language_code || urlParams.language_code || 'ru'
            };

            // Сохраняем в localStorage для использования на других страницах
            this.saveToStorage();
        } else {
            // Пробуем загрузить из localStorage
            this.loadFromStorage();
        }
    }

    // Получение данных из URL параметров
    getUserDataFromURL() {
        const urlParams = this.getUrlParams();
        if (urlParams.user_id) {
            this.userData = {
                id: urlParams.user_id,
                firstName: urlParams.first_name || 'User',
                lastName: urlParams.last_name || '',
                username: urlParams.username || '',
                photoUrl: urlParams.photo_url || '',
                languageCode: urlParams.language_code || 'ru'
            };
            this.saveToStorage();
        } else {
            this.loadFromStorage();
        }
    }

    // Парсинг URL параметров
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            user_id: params.get('user_id'),
            username: params.get('username'),
            first_name: params.get('first_name'),
            last_name: params.get('last_name'),
            photo_url: params.get('photo_url'),
            language_code: params.get('language_code')
        };
    }

    // Сохранение в localStorage
    saveToStorage() {
        if (this.userData) {
            try {
                localStorage.setItem('telegram_user_data', JSON.stringify(this.userData));
            } catch (e) {
                // Игнорируем ошибки сохранения
            }
        }
    }

    // Загрузка из localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('telegram_user_data');
            if (stored) {
                this.userData = JSON.parse(stored);
            }
        } catch (e) {
            // Игнорируем ошибки загрузки
        }
    }

    // Получение полного имени
    getFullName() {
        if (!this.userData) return 'User';
        return `${this.userData.firstName} ${this.userData.lastName}`.trim();
    }

    // Получение отображаемого имени (с username если есть)
    getDisplayName() {
        if (!this.userData) return 'User';
        const fullName = this.getFullName();
        return this.userData.username ? `${fullName} (@${this.userData.username})` : fullName;
    }

    // Заполнение данных на странице
    fillUserData() {
        if (!this.userData) {
            return;
        }

        // Заполняем никнеймы
        this.fillNicknames();
        
        // Заполняем ID
        this.fillUserIds();
        
        // Заполняем аватары
        this.fillAvatars();
    }

    // Заполнение никнеймов
    fillNicknames() {
        // Различные селекторы для никнеймов
        const nicknameSelectors = [
            '.nickname .text-wrapper', 
            '.username .text-wrapper',
            '.user-name .text-wrapper',
            '.name .text-wrapper',
            '[data-user="nickname"]',
            '[data-telegram="username"]'
        ];

        const displayName = this.userData.username || this.getFullName();

        nicknameSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.textContent = displayName;
            });
        });
    }

    // Заполнение ID пользователя
    fillUserIds() {
        // Различные селекторы для ID
        const idSelectors = [
            '.element .div',
            '.user-id .div',
            '.telegram-id .div',
            '[data-user="id"]',
            '[data-telegram="id"]'
        ];

        idSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.textContent = `#${this.userData.id}`;
            });
        });
    }

    // Заполнение аватаров
    fillAvatars() {
        // Различные селекторы для аватаров
        const avatarSelectors = [
            '.avatar',
            '.profile-avatar',
            '.user-avatar',
            '[data-user="avatar"]',
            '[data-telegram="avatar"]'
        ];

        avatarSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.setAvatar(element);
            });
        });
    }

    // Установка аватара
    setAvatar(element) {
        if (this.userData.photoUrl) {
            // Если есть фото профиля
            element.style.backgroundImage = `url(${this.userData.photoUrl})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
            element.style.backgroundRepeat = 'no-repeat';
            element.innerHTML = ''; // Убираем текст если есть
        } else {
            // Если нет фото - показываем инициалы
            const initials = this.getInitials();
            element.style.backgroundImage = 'none';
            element.style.backgroundColor = this.getAvatarColor();
            element.style.color = '#fff';
            element.style.display = 'flex';
            element.style.alignItems = 'center';
            element.style.justifyContent = 'center';
            element.style.fontSize = '18px';
            element.style.fontWeight = 'bold';
            element.innerHTML = initials;
        }
    }

    // Получение инициалов
    getInitials() {
        if (!this.userData) return 'U';
        const first = this.userData.firstName.charAt(0).toUpperCase();
        const last = this.userData.lastName.charAt(0).toUpperCase();
        return first + (last || '');
    }

    // Получение цвета аватара на основе ID
    getAvatarColor() {
        if (!this.userData) return '#6B73FF';
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        const colorIndex = parseInt(this.userData.id) % colors.length;
        return colors[colorIndex];
    }

    // Публичные методы для получения данных
    getUserId() {
        return this.userData?.id || null;
    }

    getUsername() {
        return this.userData?.username || null;
    }

    getFirstName() {
        return this.userData?.firstName || null;
    }

    getLastName() {
        return this.userData?.lastName || null;
    }

    getPhotoUrl() {
        return this.userData?.photoUrl || null;
    }

    // Метод для принудительного обновления данных
    refresh() {
        this.getUserData();
        this.fillUserData();
    }

    // Метод для ручного заполнения конкретных элементов
    fillCustomElements(config) {
        if (!this.userData) return;

        Object.keys(config).forEach(selector => {
            const elements = document.querySelectorAll(selector);
            const dataType = config[selector];
            
            elements.forEach(element => {
                switch(dataType) {
                    case 'nickname':
                        element.textContent = this.userData.username || this.getFullName();
                        break;
                    case 'fullname':
                        element.textContent = this.getFullName();
                        break;
                    case 'id':
                        element.textContent = `#${this.userData.id}`;
                        break;
                    case 'avatar':
                        this.setAvatar(element);
                        break;
                }
            });
        });
    }
}

// Автоматическая инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Создаем глобальный экземпляр
    window.TelegramUser = new TelegramUserData();
});

// Экспорт для использования в других скриптах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramUserData;
}