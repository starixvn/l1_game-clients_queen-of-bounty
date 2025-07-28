const path = require('path');
const { CommonUtils, copyFile, mkdir, readdir, stat, unlink, readFile, writeFile } = require('../utils/common');
const { logger } = require('../utils/logger');
const PROJECT_PATHS = require('../utils/paths');

class FileSynchronizer {
    constructor(options = {}) {
        this.operationLog = [];
        this.config = null;
        this.copyType = options.type || 'all';
        
        // Configuration paths
        this.folderMapPath = path.join(PROJECT_PATHS.CONFIG.ROOT, 'folder-mapping.json');
    }

    async run() {
        logger.info(`Starting sync: ${this.copyType}`);
        
        await this._loadConfig();
        
        const itemsToProcess = this.getItemsToProcess(this.copyType);
        
        if (itemsToProcess.length === 0) {
            logger.warn('⚠️ No items found to sync');
            return;
        }
        
        logger.info(`Will sync ${itemsToProcess.length} items: ${itemsToProcess.join(', ')}`);
        
        await this._syncAllItems(itemsToProcess);
        this._showResults();
        
        logger.success(`✅ Completed! Total ${this.operationLog.length} operations`);
    }

    async _loadConfig() {
        try {
            const data = await readFile(this.folderMapPath, 'utf8');
            this.config = JSON.parse(data);
        } catch (error) {
            const message = error.code === 'ENOENT' 
                ? `Cannot find folder-mapping.json at ${this.folderMapPath}`
                : `Configuration file format error: ${error.message}`;
            throw new Error(message);
        }
    }

    getItemsToProcess(target = 'all') {
        const { groups, items } = this.config;
        
        // First check if target is a specific item (like 'font-bitmap')
        if (items[target]) {
            return [target];
        }
        
        // Then check if target is a group
        const groupMap = {
            'all': 'all',
            '2D': '2d',
            '3D': '3d',
            '2d': '2d',
            '3d': '3d'
        };
        
        const groupName = groupMap[target] || target;
        
        if (groups[groupName]) {
            return groups[groupName];
        }

        logger.warn(`⚠️ Target '${target}' not found in groups or items, using default group 'all'`);
        return groups.all || [];
    }

    async _syncAllItems(itemsToProcess) {
        for (const itemName of itemsToProcess) {
            const item = this.config.items[itemName];
            if (!item) {
                logger.warn(`⚠️ Item configuration not found: ${itemName}`);
                continue;
            }

            const sourcePath = path.join(PROJECT_PATHS.OUTPUT.DOWNLOADS, item.sourcePath);
            const destinationPath = path.join(PROJECT_PATHS.REPO_ROOT, item.targetPath);
            
            logger.info(`📂 Syncing: ${itemName} (${item.description})`);
            
            await this.syncFolder(sourcePath, destinationPath);
        }
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
        // Default exclude patterns - can be made configurable if needed
        const excludePatterns = ['.DS_Store', 'Thumbs.db', '.git', '.meta'];
        return CommonUtils.shouldSkipFile(itemName, excludePatterns);
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
        'errors.configMissing': '❌ folder-mapping.json configuration file not found',
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

function parseArgs() {
    const args = process.argv.slice(2);
    const options = { type: 'all' };
    
    // Simple argument parsing - first non-flag argument is the target
    if (args.length > 0 && !args[0].startsWith('-')) {
        options.type = args[0];
    } else if (args.length > 0) {
        logger.error(`Unknown parameter: ${args[0]}`);
        process.exit(1);
    }
    
    return options;
}

async function main() {
    try {
        const options = parseArgs();
        
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

module.exports = { FileSynchronizer };