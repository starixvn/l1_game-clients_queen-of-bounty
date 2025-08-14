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

class ConfigManager {
    static instance = null;
    
    static getInstance() {
        if (!this.instance) {
            this.instance = new ConfigManager();
        }
        return this.instance;
    }
    
    constructor() {
        this.folderMapping = null;
        this.appConfig = null;
        this.PROJECT_PATHS = require('./paths');
    }
    
    async loadFolderMapping() {
        if (this.folderMapping) return this.folderMapping;
        
        try {
            const folderMapPath = path.join(this.PROJECT_PATHS.CONFIG.ROOT, 'folder-mapping.json');
            const data = await readFile(folderMapPath, 'utf8');
            this.folderMapping = JSON.parse(data);
            return this.folderMapping;
        } catch (error) {
            const message = error.code === 'ENOENT' 
                ? 'Cannot find folder-mapping.json configuration file'
                : `Configuration file format error: ${error.message}`;
            throw new Error(message);
        }
    }
    
    loadFolderMappingSync() {
        if (this.folderMapping) return this.folderMapping;
        
        try {
            const folderMapPath = path.join(this.PROJECT_PATHS.CONFIG.ROOT, 'folder-mapping.json');
            const data = fs.readFileSync(folderMapPath, 'utf8');
            this.folderMapping = JSON.parse(data);
            return this.folderMapping;
        } catch (error) {
            const message = error.code === 'ENOENT' 
                ? 'Cannot find folder-mapping.json configuration file'
                : `Configuration file format error: ${error.message}`;
            throw new Error(message);
        }
    }
    
    getItemsToProcess(target = 'all') {
        const config = this.folderMapping || this.loadFolderMappingSync();
        const { groups, items } = config;
        
        // First check if target is a specific item
        if (items[target]) {
            return [target];
        }
        
        // Then check if target is a group
        if (groups[target]) {
            return groups[target];
        }

        console.warn(`⚠️ Target '${target}' not found in groups or items, using default group 'all'`);
        return groups.all || [];
    }
    
    getItemConfig(itemName) {
        const config = this.folderMapping || this.loadFolderMappingSync();
        return config.items[itemName] || null;
    }
}

class StatsManager {
    constructor(name = 'Operation') {
        this.name = name;
        this.stats = {
            total: 0,
            completed: 0,
            failed: 0,
            skipped: 0,
            startTime: null,
            endTime: null,
            details: new Map()
        };
    }
    
    start() {
        this.stats.startTime = Date.now();
    }
    
    end() {
        this.stats.endTime = Date.now();
    }
    
    increment(type, detail = null) {
        if (this.stats.hasOwnProperty(type)) {
            this.stats[type]++;
        }
        
        if (detail) {
            if (!this.stats.details.has(detail)) {
                this.stats.details.set(detail, { completed: 0, failed: 0, skipped: 0 });
            }
            this.stats.details.get(detail)[type]++;
        }
    }
    
    getDuration() {
        if (!this.stats.startTime || !this.stats.endTime) return 0;
        return (this.stats.endTime - this.stats.startTime) / 1000;
    }
    
    getFormattedStats() {
        const duration = this.getDuration();
        const total = this.stats.completed + this.stats.failed + this.stats.skipped;
        
        return {
            name: this.name,
            total,
            completed: this.stats.completed,
            failed: this.stats.failed,
            skipped: this.stats.skipped,
            duration: `${duration.toFixed(2)}s`,
            details: Object.fromEntries(this.stats.details)
        };
    }
}

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
                    
                default:
                    if (arg.startsWith('--')) {
                        console.warn(`⚠️ Unknown option: ${arg}`);
                    } else if (!arg.startsWith('-')) {
                        options.type = arg;
                    }
            }
        }
        
        return options;
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
    
    static handleError(error, context = 'Operation') {
        if (error.code === 'SIGINT') {
            console.warn(`⚠️ ${context} interrupted`);
            process.exit(0);
        } else {
            console.error(`❌ ${context} failed: ${error.message}`);
            process.exit(1);
        }
    }
    
    static logOperationResult(stats, logger) {
        const formattedStats = stats.getFormattedStats();
        
        logger.info(`\n📊 ${formattedStats.name} Summary:`);
        logger.info('='.repeat(40));
        logger.info(`Total: ${formattedStats.total}`);
        logger.info(`✅ Completed: ${formattedStats.completed}`);
        logger.info(`⏭️ Skipped: ${formattedStats.skipped}`);
        logger.info(`❌ Failed: ${formattedStats.failed}`);
        logger.info(`🕒 Duration: ${formattedStats.duration}`);
        
        if (formattedStats.details && Object.keys(formattedStats.details).length > 0) {
            logger.info('='.repeat(40));
            Object.entries(formattedStats.details).forEach(([detail, stats]) => {
                logger.info(`${detail}: ${stats.completed}/${stats.completed + stats.failed + stats.skipped} (${stats.skipped} skipped, ${stats.failed} failed)`);
            });
        }
        
        logger.info('='.repeat(40));
    }
}

module.exports = {
    CommonUtils,
    ConfigManager,
    StatsManager,
    copyFile,
    mkdir,
    readdir,
    stat,
    unlink,
    readFile,
    writeFile
}; 