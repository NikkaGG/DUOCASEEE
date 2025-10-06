// API для интеграции игр с глобальным балансом
class GameBalanceAPI {
    constructor() {
        this.balance = window.GlobalBalance;
        this.init();
    }

    init() {
        // Ждем загрузки глобального баланса
        if (!this.balance) {
            setTimeout(() => this.init(), 100);
            return;
        }
        
    }

    // Проверить, достаточно ли средств для ставки
    canPlaceBet(amount, currency = 'chips') {
        if (currency === 'chips') {
            return this.balance.hasEnoughChips(amount);
        } else if (currency === 'rubles') {
            return this.balance.hasEnoughRubles(amount);
        }
        return false;
    }

    // Сделать ставку (списать средства)
    placeBet(amount, currency = 'chips') {
        if (currency === 'chips') {
            return this.balance.subtractChips(amount);
        } else if (currency === 'rubles') {
            return this.balance.subtractRubles(amount);
        }
        return false;
    }

    // Выплатить выигрыш
    payWinnings(amount, currency = 'chips') {
        if (currency === 'chips') {
            this.balance.addChips(amount);
        } else if (currency === 'rubles') {
            this.balance.addRubles(amount);
        }
    }

    // Получить текущий баланс
    getBalance(currency = 'all') {
        if (currency === 'chips') {
            return this.balance.getChips();
        } else if (currency === 'rubles') {
            return this.balance.getRubles();
        }
        return this.balance.getBalance();
    }

    // Обновить отображение баланса
    updateDisplay() {
        if (this.balance && this.balance.updateMainBalance) {
            this.balance.updateMainBalance();
        }
    }

    // Проверить и выполнить ставку с проверкой баланса
    safeBet(amount, currency = 'chips') {
        if (this.canPlaceBet(amount, currency)) {
            return this.placeBet(amount, currency);
        }
        return false;
    }

    // Выплатить выигрыш с обновлением отображения
    payWinningsAndUpdate(amount, currency = 'chips') {
        this.payWinnings(amount, currency);
        this.updateDisplay();
    }

    // Сделать ставку и обновить отображение
    placeBetAndUpdate(amount, currency = 'chips') {
        const success = this.placeBet(amount, currency);
        if (success) {
            this.updateDisplay();
        }
        return success;
    }

    // Конвертировать валюты
    convertCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === 'chips' && toCurrency === 'rubles') {
            return this.balance.convertChipsToRubles(amount);
        } else if (fromCurrency === 'rubles' && toCurrency === 'chips') {
            return this.balance.convertRublesToChips(amount);
        }
        return amount;
    }

    // Обменять валюты
    exchangeCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === 'chips' && toCurrency === 'rubles') {
            return this.balance.exchangeChipsToRubles(amount);
        } else if (fromCurrency === 'rubles' && toCurrency === 'chips') {
            return this.balance.exchangeRublesToChips(amount);
        }
        return false;
    }

    // Получить информацию о балансе для отображения
    getBalanceInfo() {
        const balance = this.getBalance();
        return {
            rubles: balance.rubles.toFixed(2),
            chips: balance.chips.toString(),
            rublesFormatted: `${balance.rubles.toFixed(2)}₽`,
            chipsFormatted: `${balance.chips} Chips`
        };
    }

    // Сбросить баланс (для тестирования)
    resetBalance() {
        this.balance.resetBalance();
        this.updateDisplay();
    }

    // Добавить тестовые средства (для разработки)
    addTestFunds() {
        this.balance.addRubles(1000);
        this.balance.addChips(500);
        this.updateDisplay();
    }
}

// Создаем глобальный экземпляр
window.GameBalanceAPI = new GameBalanceAPI();

// Автоматически обновляем отображение при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (window.GameBalanceAPI) {
        window.GameBalanceAPI.updateDisplay();
    }
});

// Экспортируем для использования в других скриптах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameBalanceAPI;
}
