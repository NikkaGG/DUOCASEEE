// Глобальная система балансов (Telegram CloudStorage + fallback)
class GlobalBalance {
    constructor() {
        this.balance = this.defaultBalance();
        this.storageKey = 'telegram_game_balance';
        this.isCloudAvailable = this.tg && this.tg.CloudStorage && typeof this.tg.CloudStorage.getItem === 'function';
        // Cache DOM elements to avoid repeated queries
        this.cachedElements = {};
        this.updateThrottle = null;
        this.init();
    }

    async init() {
        await this.loadBalance();
        this.updateMainBalance();

        // Слушаем локальные изменения как fallback
        window.addEventListener('storage', async (e) => {
            if (e.key === this.storageKey) {
                await this.loadFromLocal();
                this.updateMainBalance();
            }
        });
    }

    defaultBalance() {
        return {
            rubles: 1000.00,
            chips: 1000
        };
    }

    getLocalItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    setLocalItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // ignore
        }
    }

    async getCloudItem(key) {
        if (!this.cloudAvailable) {
            return null;
        }
        return new Promise((resolve) => {
            this.tg.CloudStorage.getItem(key, (error, value) => {
                if (error) {
                    resolve(null);
                } else {
                    resolve(value);
                }
            });
        });
    }

    async setCloudItem(key, value) {
        if (!this.cloudAvailable) {
            return false;
        }
        return new Promise((resolve) => {
            this.tg.CloudStorage.setItem(key, value, () => {
                resolve(true);
            });
        });
    }

    async loadFromLocal() {
        const stored = this.getLocalItem(this.storageKey);
        if (!stored) {
            this.balance = this.defaultBalance();
            return;
        }
        try {
            const parsed = JSON.parse(stored);
            this.balance = {
                rubles: parseFloat(parsed.rubles) || 1000.00,
                chips: parseInt(parsed.chips, 10) || 1000
            };
        } catch (e) {
            this.balance = this.defaultBalance();
        }
    }

    async loadBalance() {
        try {
            const cloudValue = await this.getCloudItem(this.storageKey);
            if (cloudValue) {
                const parsed = JSON.parse(cloudValue);
                this.balance = {
                    rubles: parseFloat(parsed.rubles) || 1000.00,
                    chips: parseInt(parsed.chips, 10) || 1000
                };
                this.setLocalItem(this.storageKey, cloudValue);
            } else {
                await this.loadFromLocal();
                await this.persistBalance();
            }
        } catch (e) {
            await this.loadFromLocal();
        }
        this.isReady = true;
    }

    async persistBalance() {
        const payload = JSON.stringify(this.balance);
        this.setLocalItem(this.storageKey, payload);
        await this.setCloudItem(this.storageKey, payload);
    }

    getBalance() {
        return { ...this.balance };
    }

    getRubles() {
        return this.balance.rubles;
    }

    getChips() {
        return this.balance.chips;
    }

    async setRubles(amount) {
        this.balance.rubles = parseFloat(amount);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async setChips(amount) {
        this.balance.chips = parseInt(amount, 10);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async addRubles(amount) {
        this.balance.rubles += parseFloat(amount);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async addChips(amount) {
        this.balance.chips += parseInt(amount, 10);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async subtractRubles(amount) {
        const newAmount = this.balance.rubles - parseFloat(amount);
        if (newAmount >= 0) {
            this.balance.rubles = newAmount;
            await this.persistBalance();
            this.updateMainBalance();
            return true;
        }
        return false;
    }

    async subtractChips(amount) {
        const newAmount = this.balance.chips - parseInt(amount, 10);
        if (newAmount >= 0) {
            this.balance.chips = newAmount;
            await this.persistBalance();
            this.updateMainBalance();
            return true;
        }
        return false;
    }

    updateMainBalance() {
        // Throttle updates to avoid excessive DOM manipulation
        if (this.updateThrottle) return;
        this.updateThrottle = setTimeout(() => {
            this.updateThrottle = null;
        }, 16); // ~60fps throttle
        
        // Cache DOM queries
        if (!this.cachedElements.balanceContainer) {
            this.cachedElements.balanceContainer = document.querySelector('.balance-1');
            if (this.cachedElements.balanceContainer) {
                this.cachedElements.groups = this.cachedElements.balanceContainer.querySelectorAll('.group-ico-1');
            }
        }
        
        if (this.cachedElements.groups) {
            this.cachedElements.groups.forEach((group, index) => {
                if (index === 0) {
                    // Рубли (без span)
                    if (!group._valueNode) {
                        group._valueNode = Array.from(group.childNodes).find((node) => 
                            node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
                        if (!group._valueNode) {
                            group._valueNode = document.createTextNode('');
                            group.insertBefore(group._valueNode, group.firstChild);
                        }
                    }
                    group._valueNode.textContent = `${this.balance.rubles.toFixed(2)} `;
                } else {
                    if (!group._span) {
                        group._span = group.querySelector('span');
                    }
                    if (group._span) {
                        group._span.textContent = this.balance.chips.toString();
                    }
                }
            });
        }

        if (!this.cachedElements.profileRubElement) {
            this.cachedElements.profileRubElement = document.querySelector('.profile .balance .div-wrapper .text-wrapper-4');
        }
        if (this.cachedElements.profileRubElement) {
            this.cachedElements.profileRubElement.textContent = this.balance.rubles.toFixed(2);
        }
    }

    updateAllBalances() {
        this.updateMainBalance();
    }

    hasEnoughRubles(amount) {
        return this.balance.rubles >= parseFloat(amount);
    }

    hasEnoughChips(amount) {
        return this.balance.chips >= parseInt(amount, 10);
    }

    async resetBalance() {
        this.balance = this.defaultBalance();
        await this.persistBalance();
        this.updateMainBalance();
    }
}

window.GlobalBalance = new GlobalBalance();

document.addEventListener('DOMContentLoaded', () => {
    if (window.GlobalBalance && window.GlobalBalance.isReady) {
        window.GlobalBalance.updateMainBalance();
    } else {
        setTimeout(() => {
            if (window.GlobalBalance) {
                window.GlobalBalance.updateMainBalance();
            }
        }, 300);
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalBalance;
}
