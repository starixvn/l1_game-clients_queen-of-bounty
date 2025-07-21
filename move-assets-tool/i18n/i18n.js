const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);

class I18n {
    constructor(language = 'en', i18nPath = null) {
        this.language = language;
        this.i18nPath = i18nPath || path.join(__dirname);
        this.messages = {};
        this.fallbackLanguage = 'en';
    }

    async init() {
        try {
            // 加載主要語言檔案
            await this.loadLanguage(this.language);
            
            // 如果主要語言不是 fallback 語言，也加載 fallback 語言
            if (this.language !== this.fallbackLanguage) {
                try {
                    await this.loadLanguage(this.fallbackLanguage, true);
                } catch (error) {
                    // Fallback 語言加載失敗時不拋出錯誤
                    console.warn(`Warning: Could not load fallback language ${this.fallbackLanguage}`);
                }
            }
        } catch (error) {
            throw new Error(`Failed to initialize i18n: ${error.message}`);
        }
    }

    async loadLanguage(language, isFallback = false) {
        const filePath = path.join(this.i18nPath, `${language}.json`);
        
        try {
            const data = await readFile(filePath, 'utf8');
            const messages = JSON.parse(data);
            
            if (isFallback) {
                this.fallbackMessages = messages;
            } else {
                this.messages = messages;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Language file not found: ${filePath}`);
            } else {
                throw new Error(`Invalid language file format: ${filePath}`);
            }
        }
    }

    setLanguage(language) {
        this.language = language;
    }

    // 取得翻譯文字，支援參數替換
    t(key, params = {}) {
        const message = this.getMessage(key);
        return this.interpolate(message, params);
    }

    // 取得訊息（支援嵌套的 key，如 'config.loaded'）
    getMessage(key) {
        const keys = key.split('.');
        let message = this.messages;

        // 嘗試從主要語言取得訊息
        for (const k of keys) {
            if (message && typeof message === 'object' && k in message) {
                message = message[k];
            } else {
                message = null;
                break;
            }
        }

        // 如果主要語言沒有找到，嘗試從 fallback 語言取得
        if (message === null && this.fallbackMessages) {
            message = this.fallbackMessages;
            for (const k of keys) {
                if (message && typeof message === 'object' && k in message) {
                    message = message[k];
                } else {
                    message = null;
                    break;
                }
            }
        }

        // 如果還是沒有找到，回傳 key 本身
        return message || key;
    }

    // 參數替換
    interpolate(message, params) {
        if (typeof message !== 'string') {
            return message;
        }

        return message.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    // 檢查是否支援某個語言
    isLanguageSupported(language) {
        const filePath = path.join(this.i18nPath, `${language}.json`);
        return fs.existsSync(filePath);
    }

    // 取得支援的語言列表
    getSupportedLanguages() {
        try {
            const files = fs.readdirSync(this.i18nPath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            return [];
        }
    }
}

module.exports = I18n; 