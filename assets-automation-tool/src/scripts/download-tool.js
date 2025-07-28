const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { CommonUtils, ConfigManager, StatsManager } = require('../utils/common');
const { logger } = require('../utils/logger');
const PROJECT_PATHS = require('../utils/paths');

// Load configuration
const configPath = path.join(__dirname, '../../config/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const FOLDER_ID = config.google.folderId;

const auth = new google.auth.GoogleAuth({
    keyFile: PROJECT_PATHS.CONFIG.CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const DOWNLOAD_CONFIG = {
    maxConcurrentDownloads: 20,
    maxConcurrentFolders: 5,
    retryAttempts: 3,
    retryDelay: 1000,
};

class FastBulkDownloader {
    constructor(options = {}) {
        this.authClient = null;
        this.drive = null;
        this.isDetailMode = options.detail || false;
        this.downloadStats = {
            totalSize: 0,
            downloaded: 0,
            folders: new Map()
        };
        this.fileQueue = [];
        this.activeTasks = new Set();
        this.outputPath = PROJECT_PATHS.OUTPUT.DOWNLOADS;
        this.configManager = ConfigManager.getInstance();
        this.stats = new StatsManager('Download');
        
        this.apiStats = {
            filesListCalls: 0,
            filesGetCalls: 0
        };
    }

    async initialize() {
        try {
            this.authClient = await auth.getClient();
            this.drive = google.drive({ version: 'v3', auth: this.authClient });
            this.ensureOutputDirectory();
            await this.configManager.loadFolderMapping();
            logger.success('🚀 Downloader initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Google Drive API', error);
            throw error;
        }
    }

    ensureOutputDirectory() {
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
            logger.info(`📁 Created output directory: ${this.outputPath}`);
        }
    }

    async downloadItem(itemName) {
        const item = this.configManager.getItemConfig(itemName);
        if (!item) {
            logger.error(`❌ Item configuration not found: ${itemName}`);
            this.stats.increment('failed', itemName);
            return false;
        }

        if (this.isDetailMode) {
            logger.info(`📥 Downloading: ${itemName}, sourcePath: ${item.sourcePath}, targetPath: ${item.targetPath}`);
        } else {
            logger.info(`📥 Downloading: ${itemName}`);
        }

        try {
            const folderName = item.sourcePath.split('/')[0];
            await this.processFolderByName(folderName, itemName);
            if (this.isDetailMode) {
                logger.success(`✅ Download completed: ${itemName}`);
            }
            this.stats.increment('completed', itemName);
            return true;
        } catch (error) {
            logger.error(`❌ Download failed ${itemName}:`, error.message);
            this.stats.increment('failed', itemName);
            return false;
        }
    }

    async processFolderByName(folderName, itemName = null) {
        try {
            if (this.isDetailMode) {
                logger.info(`📂 Processing folder: ${folderName}`);
            }
            
            const folderId = await this.findFolderByName(folderName, FOLDER_ID);
            if (!folderId) {
                logger.warn(`⚠️ Folder '${folderName}' not found`);
                if (itemName) this.stats.increment('failed', itemName);
                return;
            }

            await this.downloadFolderContents(folderId, folderName);
            
        } catch (error) {
            logger.error(`❌ Failed to process folder '${folderName}'`, error);
            if (itemName) this.stats.increment('failed', itemName);
        }
    }

    async findFolderByName(folderName, parentId) {
        try {
            const response = await this.drive.files.list({
                q: `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder'`,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });

            this.apiStats.filesListCalls++;

            if (response.data.files && response.data.files.length > 0) {
                return response.data.files[0].id;
            }
            return null;

        } catch (error) {
            logger.error(`Failed to find folder '${folderName}'`, error);
            return null;
        }
    }

    async downloadFolderContents(folderId, folderName, relativePath = '') {
        try {
            const files = await this.listFolderContents(folderId);
            
            if (files.length === 0) {
                if (this.isDetailMode) {
                    logger.info(`📭 Folder '${folderName}' is empty`);
                }
                return;
            }
            
            this.downloadStats.folders.set(folderName, {
                total: files.length,
                completed: 0,
                failed: 0,
                skipped: 0
            });

            const concurrentLimit = DOWNLOAD_CONFIG.maxConcurrentDownloads;
            const chunks = this.chunkArray(files, concurrentLimit);

            for (const chunk of chunks) {
                const downloadPromises = chunk.map(file => 
                    this.downloadFileWithRetry(file, folderName, relativePath)
                );
                
                await Promise.allSettled(downloadPromises);
            }

            if (this.isDetailMode) {
                const folderStats = this.downloadStats.folders.get(folderName);
                logger.success(`✅ Folder '${folderName}' completed: ${folderStats.completed}/${folderStats.total} files (${folderStats.skipped} skipped)`);
            }

        } catch (error) {
            logger.error(`Failed to download folder contents for '${folderName}'`, error);
        }
    }

    async listFolderContents(folderId) {
        try {
            const response = await this.drive.files.list({
                q: `parents in '${folderId}'`,
                fields: 'files(id, name, size, mimeType, modifiedTime)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 1000
            });

            this.apiStats.filesListCalls++;

            return response.data.files || [];

        } catch (error) {
            logger.error('Failed to list folder contents', error);
            return [];
        }
    }

    async downloadFileWithRetry(file, folderName, relativePath) {
        for (let attempt = 1; attempt <= DOWNLOAD_CONFIG.retryAttempts; attempt++) {
            try {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    await this.downloadFolderContents(file.id, folderName, path.join(relativePath, file.name));
                    return;
                }

                const result = await this.downloadSingleFile(file, folderName, relativePath);
                
                const folderStats = this.downloadStats.folders.get(folderName);
                if (folderStats) {
                    if (result === 'skipped') {
                        folderStats.skipped++;
                    } else {
                        folderStats.completed++;
                    }
                }
                
                return;

            } catch (error) {
                logger.warn(`⚠️ Download attempt ${attempt}/${DOWNLOAD_CONFIG.retryAttempts} failed for '${file.name}': ${error.message}`);
                
                if (attempt === DOWNLOAD_CONFIG.retryAttempts) {
                    logger.error(`❌ Final attempt failed for '${file.name}'`);
                    const folderStats = this.downloadStats.folders.get(folderName);
                    if (folderStats) {
                        folderStats.failed++;
                    }
                } else {
                    await this.delay(DOWNLOAD_CONFIG.retryDelay * attempt);
                }
            }
        }
    }

    async downloadSingleFile(file, folderName, relativePath) {
        const targetDir = path.join(this.outputPath, folderName, relativePath);
        const targetPath = path.join(targetDir, file.name);

        CommonUtils.ensureDirectoryExists(targetPath);

        if (fs.existsSync(targetPath)) {
            const localStats = fs.statSync(targetPath);
            const remoteSize = parseInt(file.size || '0');
            const remoteModifiedTime = new Date(file.modifiedTime);
            const localModifiedTime = localStats.mtime;
            
            if (localStats.size === remoteSize && localModifiedTime >= remoteModifiedTime) {
                if (this.isDetailMode) {
                    logger.info(`⏭️ Skipping '${file.name}' (already exists with same size and modification time)`);
                }
                return 'skipped';
            }
        }

        const response = await this.drive.files.get({
            fileId: file.id,
            alt: 'media',
            supportsAllDrives: true
        }, { responseType: 'stream' });

        this.apiStats.filesGetCalls++;

        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(targetPath);
            let downloadedBytes = 0;
            const fileSize = parseInt(file.size || '0');

            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                this.downloadStats.downloaded += chunk.length;
            });

            response.data.on('end', () => {
                if (this.isDetailMode) {
                    logger.info(`✅ Downloaded: ${file.name} (${CommonUtils.formatBytes(downloadedBytes)})`);
                }
                resolve();
            });

            response.data.on('error', (error) => {
                logger.error(`❌ Download failed for '${file.name}'`, error);
                writeStream.destroy();
                if (fs.existsSync(targetPath)) {
                    fs.unlinkSync(targetPath);
                }
                reject(error);
            });

            response.data.pipe(writeStream);

            writeStream.on('error', (error) => {
                logger.error(`❌ Write failed for '${file.name}'`, error);
                reject(error);
            });
        });
    }

    async run() {
        const args = process.argv.slice(2).filter(arg => arg !== '--detail');
        const target = args[0] || 'all';
        logger.info(`🚀 Starting download - target: ${target}`);
        
        const itemsToProcess = this.configManager.getItemsToProcess(target);
        
        if (itemsToProcess.length === 0) {
            logger.info('ℹ️  No items to process');
            return;
        }

        if (this.isDetailMode) {
            logger.info(`📦 Will process ${itemsToProcess.length} items:`, itemsToProcess.join(', '));
        }
        
        this.stats.start();

        for (const itemName of itemsToProcess) {
            try {
                await this.downloadItem(itemName);
            } catch (error) {
                logger.error(`❌ Download failed ${itemName}:`, error.message);
                this.stats.increment('failed', itemName);
            }
        }
        
        this.stats.end();
        this.showFinalStats();
    }

    showFinalStats() {
        const speed = CommonUtils.calculateSpeed(this.downloadStats.downloaded, this.stats.stats.startTime, this.stats.stats.endTime);

        if (this.isDetailMode) {
            logger.info('\n📊 Download Statistics:');
            logger.info('='.repeat(50));
            logger.info(`📊 Total downloaded: ${CommonUtils.formatBytes(this.downloadStats.downloaded)}`);
            logger.info(`🚀 Average speed: ${speed}`);
            logger.info('='.repeat(50));

            this.downloadStats.folders.forEach((stats, folderName) => {
                logger.info(`${folderName}: ${stats.completed}/${stats.total} files (${stats.skipped} skipped, ${stats.failed} failed)`);
            });

            logger.info('='.repeat(50));
        } else {        
            if (this.downloadStats.downloaded > 0) {
                logger.info(`Total downloaded: ${CommonUtils.formatBytes(this.downloadStats.downloaded)}`);
            }
        }

        logger.info('\n🔌 API Token Usage:');
        logger.info(`files.list calls: ${this.apiStats.filesListCalls}`);
        logger.info(`files.get calls: ${this.apiStats.filesGetCalls}`);
        
        CommonUtils.logOperationResult(this.stats, logger);
    }

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

async function main() {
    const args = process.argv.slice(2);
    const options = CommonUtils.parseArgs(args);

    if (args.includes('--detail')) {
        options.detail = true;
    }

    const tool = new FastBulkDownloader(options);

    try {
        await tool.initialize();
        await tool.run();

    } catch (error) {
        CommonUtils.handleError(error, 'Download');
    }
}

if (require.main === module) {
    main();
}

module.exports = FastBulkDownloader;
