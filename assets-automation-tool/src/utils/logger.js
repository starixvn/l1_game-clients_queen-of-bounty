const fs = require('fs');
const path = require('path');
const PROJECT_PATHS = require('./paths');

class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.enableFileLog = options.enableFileLog || false;
        this.logFile = options.logFile || path.join(PROJECT_PATHS.OUTPUT.ROOT, 'logs', 'app.log');
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
            success: '✅',
            progress: '🔄'
        };
        
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (this.enableFileLog) {
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }

    log(level, message, data = null) {
        if (this.levels[level] <= this.levels[this.level]) {
            const icon = this.icons[level] || '';
            const logMessage = `${icon} ${message}`;
            
            if (this.enableConsole) {
                console.log(logMessage);
                if (data) {
                    console.log(data);
                }
            }
            
            if (this.enableFileLog) {
                const timestamp = new Date().toISOString();
                const fileMessage = `[${timestamp}] ${logMessage}`;
                this.writeToFile(fileMessage, data);
            }
        }
    }

    writeToFile(message, data = null) {
        try {
            const logEntry = data ? `${message}\n${JSON.stringify(data, null, 2)}\n` : `${message}\n`;
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    error(message, error = null) {
        const fullMessage = error ? `${message}: ${error.message}` : message;
        this.log('error', fullMessage, error?.stack);
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
        const logMessage = `${this.icons.success} ${message}`;
        
        if (this.enableConsole) {
            console.log(logMessage);
            if (data) console.log(data);
        }
        
        if (this.enableFileLog) {
            const timestamp = new Date().toISOString();
            const fileMessage = `[${timestamp}] ${logMessage}`;
            this.writeToFile(fileMessage, data);
        }
    }

    progress(message, current, total) {
        const percentage = Math.round((current / total) * 100);
        const progressMessage = `${message} (${current}/${total} - ${percentage}%)`;
        this.log('info', progressMessage);
    }

    stats(title, stats) {
        const timestamp = new Date().toISOString();
        const separator = '='.repeat(50);
        const logMessage = `[${timestamp}]\n${separator}\n${title}\n${separator}\n${this.formatStats(stats)}\n${separator}`;
        
        if (this.enableConsole) {
            console.log(logMessage);
        }
        
        if (this.enableFileLog) {
            this.writeToFile(logMessage);
        }
    }

    formatStats(stats) {
        return Object.entries(stats)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
    }
}

const logger = new Logger({
    level: process.env.LOG_LEVEL || 'info',
    enableFileLog: process.env.ENABLE_FILE_LOG === 'true',
    enableConsole: true
});

module.exports = { Logger, logger }; 