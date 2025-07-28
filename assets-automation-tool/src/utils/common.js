const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

class CommonUtils {
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static ensureDirectoryExists(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    static shouldSkipFile(itemName, excludePatterns) {
        return excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(itemName);
            }
            if (pattern.includes('?')) {
                const regex = new RegExp('^' + pattern.replace(/\?/g, '.') + '$');
                return regex.test(itemName);
            }
            return itemName === pattern;
        });
    }

    static calculateSpeed(totalBytes, startTime, endTime) {
        const durationSeconds = (endTime - startTime) / 1000;
        const bytesPerSecond = totalBytes / durationSeconds;
        return this.formatBytes(bytesPerSecond) + '/s';
    }

    static parseArgs(args, validOptions = {}) {
        const options = { ...validOptions };
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {                    
                case '--detail':
                    options.detail = true;
                    break;
                    
                case '--copytype':
                case '-c':
                    if (i + 1 < args.length) {
                        options.type = args[++i];
                    }
                    break;
                    
                case '--folder':
                case '-f':
                    if (i + 1 < args.length) {
                        options.folder = args[++i];
                    }
                    break;
                    
                default:
                    if (arg.startsWith('--')) {
                        console.warn(`⚠️ Unknown option: ${arg}`);
                    }
            }
        }
        
        return options;
    }

    static showProgress(current, total, prefix = 'Progress') {
        const percentage = Math.round((current / total) * 100);
        const barLength = 30;
        const filledLength = Math.round((barLength * current) / total);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r${prefix}: ${bar} ${percentage}% (${current}/${total})`);
        
        if (current === total) {
            process.stdout.write('\n');
        }
    }

    static async safeFileOperation(operation, errorMessage = 'File operation failed') {
        try {
            return await operation();
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`${errorMessage}: File not found`);
            }
            throw new Error(`${errorMessage}: ${error.message}`);
        }
    }
}

module.exports = {
    CommonUtils,
    copyFile,
    mkdir,
    readdir,
    stat,
    unlink,
    readFile,
    writeFile
}; 