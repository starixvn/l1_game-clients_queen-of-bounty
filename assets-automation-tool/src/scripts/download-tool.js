const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { CommonUtils } = require('../utils/common');
const { logger } = require('../utils/logger');
const PROJECT_PATHS = require('../utils/paths');

const FOLDER_ID = '1TKh17Q9yX5HM2q91MHkNs2qYR8b_IH2-';

const auth = new google.auth.GoogleAuth({
    keyFile: PROJECT_PATHS.CONFIG.CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const DOWNLOAD_CONFIG = {
    maxConcurrentDownloads: 10,
    maxConcurrentFolders: 5,
    retryAttempts: 3,
    retryDelay: 1000,
};

const folderNames = [
    "btn-spin",
    "decor",
    "effect",
    "font-bitmap",
    "game-guide",
    "icon-game",
    "mascot",
    "replace-assets",
    "resources-json",
    "symbol-spine",
    "texture-packer",
    "transition"
];

class FastBulkDownloader {
    constructor(options = {}) {
        this.isDryRun = options.isDryRun || false;
        this.authClient = null;
        this.drive = null;
        this.downloadStats = {
            total: 0,
            completed: 0,
            failed: 0,
            totalSize: 0,
            downloaded: 0,
            startTime: null,
            folders: new Map()
        };
        this.fileQueue = [];
        this.activeTasks = new Set();
        this.outputPath = PROJECT_PATHS.OUTPUT.DOWNLOADS;
    }

    async initialize() {
        try {
            this.authClient = await auth.getClient();
            this.drive = google.drive({ version: 'v3', auth: this.authClient });
            this.ensureOutputDirectory();
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

    async startBulkDownload() {
        if (this.isDryRun) {
            logger.info('🧪 DRY RUN MODE - No files will be downloaded');
        }

        this.downloadStats.startTime = Date.now();
        logger.info('🔍 Starting bulk download process...');

        try {
            for (const folderName of folderNames) {
                await this.processFolderByName(folderName);
            }

            logger.success(`✅ Bulk download completed! ${this.downloadStats.completed} files downloaded`);
            this.showFinalStats();

        } catch (error) {
            logger.error('❌ Bulk download failed', error);
            throw error;
        }
    }

    async processFolderByName(folderName) {
        try {
            logger.info(`📂 Processing folder: ${folderName}`);
            
            const folderId = await this.findFolderByName(folderName, FOLDER_ID);
            if (!folderId) {
                logger.warn(`⚠️ Folder '${folderName}' not found`);
                return;
            }

            await this.downloadFolderContents(folderId, folderName);
            
        } catch (error) {
            logger.error(`❌ Failed to process folder '${folderName}'`, error);
            this.downloadStats.failed++;
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
                logger.info(`📭 Folder '${folderName}' is empty`);
                return;
            }

            logger.info(`📁 Found ${files.length} items in '${folderName}'`);
            
            this.downloadStats.folders.set(folderName, {
                total: files.length,
                completed: 0,
                failed: 0
            });

            const concurrentLimit = DOWNLOAD_CONFIG.maxConcurrentDownloads;
            const chunks = this.chunkArray(files, concurrentLimit);

            for (const chunk of chunks) {
                const downloadPromises = chunk.map(file => 
                    this.downloadFileWithRetry(file, folderName, relativePath)
                );
                
                await Promise.allSettled(downloadPromises);
            }

            const folderStats = this.downloadStats.folders.get(folderName);
            logger.success(`✅ Folder '${folderName}' completed: ${folderStats.completed}/${folderStats.total} files`);

        } catch (error) {
            logger.error(`Failed to download folder contents for '${folderName}'`, error);
        }
    }

    async listFolderContents(folderId) {
        try {
            const response = await this.drive.files.list({
                q: `parents in '${folderId}'`,
                fields: 'files(id, name, size, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 1000
            });

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

                await this.downloadSingleFile(file, folderName, relativePath);
                
                this.downloadStats.completed++;
                const folderStats = this.downloadStats.folders.get(folderName);
                if (folderStats) {
                    folderStats.completed++;
                }
                
                return;

            } catch (error) {
                logger.warn(`⚠️ Download attempt ${attempt}/${DOWNLOAD_CONFIG.retryAttempts} failed for '${file.name}': ${error.message}`);
                
                if (attempt === DOWNLOAD_CONFIG.retryAttempts) {
                    logger.error(`❌ Final attempt failed for '${file.name}'`);
                    this.downloadStats.failed++;
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
        if (this.isDryRun) {
            logger.info(`[DRY RUN] Would download: ${folderName}/${relativePath}/${file.name}`);
            return;
        }

        const targetDir = path.join(this.outputPath, folderName, relativePath);
        const targetPath = path.join(targetDir, file.name);

        CommonUtils.ensureDirectoryExists(targetPath);

        if (fs.existsSync(targetPath)) {
            const localStats = fs.statSync(targetPath);
            const remoteSize = parseInt(file.size || '0');
            
            if (localStats.size === remoteSize) {
                logger.info(`⏭️ Skipping '${file.name}' (already exists with same size)`);
                return;
            }
        }

        const response = await this.drive.files.get({
            fileId: file.id,
            alt: 'media',
            supportsAllDrives: true
        }, { responseType: 'stream' });

        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(targetPath);
            let downloadedBytes = 0;
            const fileSize = parseInt(file.size || '0');

            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                this.downloadStats.downloaded += chunk.length;
            });

            response.data.on('end', () => {
                logger.info(`✅ Downloaded: ${file.name} (${CommonUtils.formatBytes(downloadedBytes)})`);
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

    showFinalStats() {
        const endTime = Date.now();
        const duration = (endTime - this.downloadStats.startTime) / 1000;
        const speed = CommonUtils.calculateSpeed(this.downloadStats.downloaded, this.downloadStats.startTime, endTime);

        logger.info('\n📊 Download Statistics:');
        logger.info('='.repeat(50));
        logger.info(`Total files: ${this.downloadStats.completed + this.downloadStats.failed}`);
        logger.info(`Successful: ${this.downloadStats.completed}`);
        logger.info(`Failed: ${this.downloadStats.failed}`);
        logger.info(`Total downloaded: ${CommonUtils.formatBytes(this.downloadStats.downloaded)}`);
        logger.info(`Duration: ${duration.toFixed(2)} seconds`);
        logger.info(`Average speed: ${speed}`);
        logger.info('='.repeat(50));

        this.downloadStats.folders.forEach((stats, folderName) => {
            logger.info(`${folderName}: ${stats.completed}/${stats.total} files (${stats.failed} failed)`);
        });

        logger.info('='.repeat(50));
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

function showHelp() {
    console.log(`
Google Drive Bulk Download Tool

Usage: node download-tool.js [options]

Options:
  --dry-run    Run in dry mode (don't actually download files)
  --help       Show this help message

Examples:
  node download-tool.js                # Download all files
  node download-tool.js --dry-run      # Show what would be downloaded
    `);
}

async function main() {
    const args = process.argv.slice(2);
    const options = CommonUtils.parseArgs(args);

    if (options.help) {
        showHelp();
        return;
    }

    try {
        const downloader = new FastBulkDownloader(options);
        await downloader.initialize();
        await downloader.startBulkDownload();

    } catch (error) {
        logger.error('❌ Application failed', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = FastBulkDownloader;
