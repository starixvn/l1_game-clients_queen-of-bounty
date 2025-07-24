const path = require('path');
const { CommonUtils, copyFile, mkdir, readdir, stat, unlink, readFile, writeFile } = require('../utils/common');
const { logger } = require('../utils/logger');
const PROJECT_PATHS = require('../utils/paths');
const ConfigManager = require('../core/ConfigManager');

class FileSynchronizer {
    constructor(options = {}) {
        this.operationLog = [];
        this.folderMapping = null;
        this.copyType = options.type || 'all';
        this.targetFolder = options.folder || null;
        
        if (!options.config) {
            throw new Error('Must provide config parameter');
        }
        this.CONFIG = options.config;
    }

    async run() {
        logger.info(`Starting sync: ${this.copyType}${this.targetFolder ? ': ' + this.targetFolder : ''}`);
        
        await this._loadMapping();
        
        const folderCount = Object.keys(this.folderMapping).length;
        if (folderCount === 0) {
            logger.warn('⚠️ No folders found to sync');
            return;
        }
        
        logger.info(`Will sync ${folderCount} folders`);
        
        await this._syncAllFolders();
        this._showResults();
        
        logger.success(`✅ Completed! Total ${this.operationLog.length} operations`);
    }

    async syncFolder(sourcePath, destinationPath) {
        if (!await this._validateAndPrepare(sourcePath, destinationPath)) {
            return;
        }

        const items = await readdir(sourcePath);
        
        for (const item of items) {
            if (this._shouldSkip(item)) {
                this._log("⏭️", "Skip", path.join(sourcePath, item));
                continue;
            }
            
            await this._processItem(item, sourcePath, destinationPath);
        }
    }

    async _loadMapping() {
        try {
            const mappingPath = path.join(PROJECT_PATHS.CONFIG.ROOT, this.CONFIG.mappingFile);
            const data = await readFile(mappingPath, 'utf8');
            const config = JSON.parse(data);
            
            this.folderMapping = this._filterMapping(config);
        } catch (error) {
            const message = error.code === 'ENOENT' 
                ? `Cannot find ${this.CONFIG.mappingFile}`
                : `Configuration file format error: ${error.message}`;
            throw new Error(message);
        }
    }

    _filterMapping(config) {
        const categories = config.categories || {};
        
        switch (this.copyType) {
            case '2D':
                return categories['2D'] || {};
                
            case '3D':
                return categories['3D'] || {};
                
            case 'folder':
                if (!this.targetFolder) {
                    throw new Error('Must specify targetFolder when using folder mode');
                }
                for (const categoryMapping of Object.values(categories)) {
                    if (categoryMapping[this.targetFolder]) {
                        return { [this.targetFolder]: categoryMapping[this.targetFolder] };
                    }
                }
                throw new Error(`Folder not found: ${this.targetFolder}`);
                
            case 'all':
            default:
                return Object.values(categories).reduce((all, category) => {
                    return { ...all, ...category };
                }, {});
        }
    }

    async _syncAllFolders() {
        for (const [key, destPath] of Object.entries(this.folderMapping)) {
            const sourcePath = path.join(this.CONFIG.sourceFolder, key);
            const fullDestPath = path.join(this.CONFIG.projectRoot, destPath);
            
            logger.info(`📂 Syncing: ${key}`);
            
            await this.syncFolder(sourcePath, fullDestPath);
        }
    }

    async _validateAndPrepare(sourcePath, destinationPath) {
        try {
            const sourceStats = await stat(sourcePath);
            if (!sourceStats.isDirectory()) {
                this._log("⚠️", "Skip", sourcePath);
                return false;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                this._log("⚠️", "Skip", sourcePath);
                return false;
            }
            throw error;
        }

        try {
            await mkdir(destinationPath, { recursive: true });
            this._log("📁", "Create folder", "", destinationPath);
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }

        return true;
    }

    async _processItem(item, sourcePath, destinationPath) {
        const sourceItem = path.join(sourcePath, item);
        const destItem = path.join(destinationPath, item);
        
        try {
            const itemStats = await stat(sourceItem);
            
            if (itemStats.isDirectory()) {
                await this.syncFolder(sourceItem, destItem);
            } else {
                await this._copyFileAndCleanup(sourceItem, destItem);
            }
        } catch (error) {
            logger.error(`Error processing file: ${sourceItem}`, error);
        }
    }

    async _copyFileAndCleanup(sourceItem, destItem) {
        await copyFile(sourceItem, destItem);
        this._log("✅", "Copy file", sourceItem, destItem);
        
        const metaFile = destItem + ".meta";
        try {
            await unlink(metaFile);
            this._log("🗑️", "Delete .meta", "", metaFile);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }

    _shouldSkip(itemName) {
        return CommonUtils.shouldSkipFile(itemName, this.CONFIG.excludePatterns);
    }

    _log(status, operation, source = "", destination = "") {
        const copyFileText = "Copy file";
        const deleteMetaText = "Delete .meta";
        if (operation === copyFileText || operation === deleteMetaText) {
            this.operationLog.push([status, operation]);
        } else {
            this.operationLog.push([status, operation, source, destination]);
        }
    }

    _showResults() {
        if (this.operationLog.length === 0) return;

        const operationStats = {};
        this.operationLog.forEach(([status, operation]) => {
            const key = `${status} ${operation}`;
            operationStats[key] = (operationStats[key] || 0) + 1;
        });

        logger.info(`\n📊 Sync Summary`);
        logger.info('='.repeat(40));
        
        Object.entries(operationStats).forEach(([operation, count]) => {
            logger.info(`${operation}: ${count}`);
        });
        
        logger.info('='.repeat(40));
    }
}

function logMessage(key, params = {}, level = 'error') {
    const fallbackMessages = {
        'errors.configMissing': '❌ config.json configuration file not found',
        'errors.useCli': 'Please use interactive CLI tool: npm run cli',
        'errors.configError': `❌ Configuration error: ${params.error}`,
        'errors.interrupted': '⚠️ Interrupted',
        'errors.general': `❌ Error: ${params.error}`
    };
    
    const message = fallbackMessages[key] || key;
    
    if (level === 'warn') {
        logger.warn(message);
    } else {
        logger.error(message);
    }
}

function logError(key, params = {}) {
    logMessage(key, params, 'error');
}

function showHelp() {
    console.log(`
File Synchronization Tool - Usage Guide

Usage: node move-assets.js [options]

Options:
  --copytype <type> Sync type: all | 2D | 3D (default: all)
  --folder <n>      Specify folder name (sync single folder directly)
  --help            Show this help message

Examples:
  node move-assets.js                        # Sync all folders
  node move-assets.js --copytype 2D          # Sync 2D assets only
  node move-assets.js --copytype 3D          # Sync 3D assets only
  node move-assets.js --folder mascot        # Sync mascot folder only
    `);
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = { type: 'all', folder: null };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
                
            case '--copytype':
            case '-c':
                if (i + 1 < args.length) {
                    options.type = args[++i];
                    if (!['all', '2D', '3D'].includes(options.type)) {
                        logger.error(`Invalid copytype: ${options.type}`);
                        process.exit(1);
                    }
                }
                break;
                
            case '--folder':
            case '-f':
                if (i + 1 < args.length) {
                    options.folder = args[++i];
                    options.type = 'folder';
                }
                break;
                
            default:
                logger.error(`Unknown parameter: ${args[i]}`);
                showHelp();
                process.exit(1);
        }
    }
    
    return options;
}

async function main() {
    try {
        let configManager = null;
        
        try {
            configManager = await ConfigManager.createInstance();
        } catch (error) {
            if (error.message.includes('Configuration file not found')) {
                const args = process.argv.slice(2);
                if (args.includes('--help') || args.includes('-h')) {
                    showHelp();
                    process.exit(0);
                }
                
                logError('errors.configMissing');
                logError('errors.useCli');
            } else {
                logError('errors.configError', { error: error.message });
            }
            process.exit(1);
        }
        
        const options = parseArgs();
        
        logger.success('✅ Configuration file loaded successfully');
        
        options.config = configManager.config;
        const synchronizer = new FileSynchronizer(options);
        await synchronizer.run();
    } catch (error) {
        if (error.code === 'SIGINT') {
            logMessage('errors.interrupted', {}, 'warn');
        } else {
            logError('errors.general', { error: error.message });
            process.exit(1);
        }
    }
}

process.on('SIGINT', () => {
    logMessage('errors.interrupted', {}, 'warn');
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = { FileSynchronizer, ConfigManager };