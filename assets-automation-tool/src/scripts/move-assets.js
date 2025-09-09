const path = require('path');
const { CommonUtils, ConfigManager, StatsManager, copyFile, mkdir, readdir, stat, unlink } = require('../utils/common');
const { logger } = require('../utils/logger');
const PROJECT_PATHS = require('../utils/paths');

class FileSynchronizer {
    constructor(options = {}) {
        this.operationLog = [];
        this.copyType = options.type || 'all';
        this.configManager = ConfigManager.getInstance();
        this.stats = new StatsManager('File Sync');
    }

    async run() {
        logger.info(`Starting sync: ${this.copyType}`);
        
        await this.configManager.loadFolderMapping();
        
        const itemsToProcess = this.configManager.getItemsToProcess(this.copyType);
        
        if (itemsToProcess.length === 0) {
            logger.warn('⚠️ No items found to sync');
            return;
        }
        
        logger.info(`Will sync ${itemsToProcess.length} items: ${itemsToProcess.join(', ')}`);
        
        this.stats.start();
        await this._syncAllItems(itemsToProcess);
        this.stats.end();
        
        this._showResults();
        
        logger.success(`✅ Completed! Total ${this.operationLog.length} operations`);
    }

    async _syncAllItems(itemsToProcess) {
        for (const itemName of itemsToProcess) {
            const item = this.configManager.getItemConfig(itemName);
            if (!item) {
                logger.warn(`⚠️ Item configuration not found: ${itemName}`);
                this.stats.increment('failed', itemName);
                continue;
            }

            const sourcePath = path.join(PROJECT_PATHS.OUTPUT.DOWNLOADS, item.sourcePath);
            const destinationPath = path.join(PROJECT_PATHS.REPO_ROOT, item.targetPath);
            
            logger.info(`📂 Syncing: ${itemName} (${item.description})`);
            
            await this.syncFolder(sourcePath, destinationPath, itemName);
        }
    }

    async syncFolder(sourcePath, destinationPath, itemName = null) {
        if (!await this._validateAndPrepare(sourcePath, destinationPath)) {
            if (itemName) this.stats.increment('failed', itemName);
            return;
        }

        const items = await readdir(sourcePath);
        
        for (const item of items) {
            if (this._shouldSkip(item)) {
                this._log("⏭️", "Skip", path.join(sourcePath, item));
                if (itemName) this.stats.increment('skipped', itemName);
                continue;
            }
            
            await this._processItem(item, sourcePath, destinationPath, itemName);
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

    async _processItem(item, sourcePath, destinationPath, itemName = null) {
        const sourceItem = path.join(sourcePath, item);
        const destItem = path.join(destinationPath, item);
        
        try {
            const itemStats = await stat(sourceItem);
            
            if (itemStats.isDirectory()) {
                await this.syncFolder(sourceItem, destItem, itemName);
            } else {
                await this._copyFileAndCleanup(sourceItem, destItem);
                if (itemName) this.stats.increment('completed', itemName);
            }
        } catch (error) {
            logger.error(`Error processing file: ${sourceItem}`, error);
            if (itemName) this.stats.increment('failed', itemName);
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
   
        CommonUtils.logOperationResult(this.stats, logger);
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = CommonUtils.parseArgs(args);
    
    // Set default type if no type was specified
    if (!options.type) {
        options.type = 'all';
    }
    
    return options;
}

async function main() {
    try {
        const options = parseArgs();
        
        const synchronizer = new FileSynchronizer(options);
        await synchronizer.run();
    } catch (error) {
        CommonUtils.handleError(error, 'File sync');
    }
}

process.on('SIGINT', () => {
    CommonUtils.handleError({ code: 'SIGINT' }, 'File sync');
});

if (require.main === module) {
    main();
}

module.exports = { FileSynchronizer };