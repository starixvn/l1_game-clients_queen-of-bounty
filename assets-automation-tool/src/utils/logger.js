const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.enableConsole = options.enableConsole !== false;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.icons = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🔍',
            success: '✅'
        };
    }

    log(level, message, data = null) {
        if (this.levels[level] <= this.levels[this.level] && this.enableConsole) {
            const icon = this.icons[level] || '';
            console.log(`${icon} ${message}`);
            if (data) {
                console.log(data);
            }
        }
    }

    error(message, error = null) {
        const fullMessage = error ? `${message}: ${error.message}` : message;
        this.log('error', fullMessage);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    debug(message, data = null) {
        this.log('debug', message, data);
    }

    success(message, data = null) {
        if (this.enableConsole) {
            console.log(`${this.icons.success} ${message}`);
            if (data) console.log(data);
        }
    }
}

const logger = new Logger({
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true
});

module.exports = { Logger, logger }; 