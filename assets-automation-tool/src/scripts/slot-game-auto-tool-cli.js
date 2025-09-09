const readline = require('readline');
const { FileSynchronizer } = require('./move-assets');
const FastBulkDownloader = require('./download-tool');
const { ConfigManager } = require('../utils/common');
const { logger } = require('../utils/logger');
const TexturePackerCLI = require('./texture-packer-cli');

const FULL = 'full';
const DOWNLOAD = 'download';
const COPY = 'copy';
const ALL = 'all';
const TWO_D = '2d';
const THREE_D = '3d';
const SPECIFIC = 'specific';
const TEXTURE_PACKER = 'texture-packer';
const SYMBOL_CHECKER = 'symbol-checker';
const FONT_BITMAP_HANDLER = 'font-bitmap-handler';

class AssetsAutomationCLI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.configManager = ConfigManager.getInstance();
    }

    async run() {
        try {
            logger.info('🎮 Welcome to Assets Automation CLI Tool!');
            await this.configManager.loadFolderMapping();
            logger.success('✅ Configuration loaded successfully');
            await this.promptOperationType();
        } catch (error) {
            logger.error(`❌ Error: ${error.message}`);
        } finally {
            this.rl.close();
        }
    }

    async promptOperationType() {
        logger.info('\n🚀 Select operation type:');
        logger.info(`   1. ${FULL}      - Download + Copy (complete workflow)`);
        logger.info(`   2. ${DOWNLOAD}  - Download assets from Google Drive`);
        logger.info(`   3. ${COPY}  - Copy/sync downloaded assets to project`);
        logger.info(`   4. ${TEXTURE_PACKER}  - Pack textures`);
        logger.info(`   5. ${SYMBOL_CHECKER}  - Symbol checker`);
        logger.info(`   6. ${FONT_BITMAP_HANDLER}  - Font bitmap handler`);

        const choice = await this.askSelect('Please select operation (1-6): ', ['1', '2', '3', '4', '5', '6', FULL, DOWNLOAD, COPY, TEXTURE_PACKER, SYMBOL_CHECKER, FONT_BITMAP_HANDLER]);
        const operationMap = {
            '1': FULL,
            '2': DOWNLOAD,
            '3': COPY,
            '4': TEXTURE_PACKER,
            '5': SYMBOL_CHECKER,
            '6': FONT_BITMAP_HANDLER,
            [FULL]: FULL,
            [DOWNLOAD]: DOWNLOAD,
            [COPY]: COPY,
            [TEXTURE_PACKER]: TEXTURE_PACKER,
            [SYMBOL_CHECKER]: SYMBOL_CHECKER,
            [FONT_BITMAP_HANDLER]: FONT_BITMAP_HANDLER,
        };
        const operation = operationMap[choice];

        if (operation === TEXTURE_PACKER) {
            await this.promptTexturePacker();
        } else if (operation === SYMBOL_CHECKER) {
            await this.executeSymbolChecker();
        } else if (operation === FONT_BITMAP_HANDLER) {
            await this.promptFontBitmapHandler();
        } else {
            await this.promptTargetSelection(operation);
        }
    }

    async promptTargetSelection(operation) {
        logger.info(`\n📦 Select target for ${operation}:`);
        logger.info(`   1. ${SPECIFIC}  - Specify a particular item`);
        logger.info(`   2. ${ALL}       - Process all assets`);
        logger.info(`   3. ${TWO_D}        - Process 2D assets only`);
        logger.info(`   4. ${THREE_D}        - Process 3D assets only`);

        const choice = await this.askSelect('Please select target (1-4): ', ['1', '2', '3', '4', SPECIFIC, ALL, TWO_D, THREE_D]);

        let target = ALL;
        const targetMap = {
            '1': SPECIFIC,
            '2': ALL,
            '3': TWO_D,
            '4': THREE_D,
            [SPECIFIC]: SPECIFIC,
            [ALL]: ALL,
            [TWO_D]: TWO_D,
            [THREE_D]: THREE_D
        };

        target = targetMap[choice];

        if (target === SPECIFIC) {
            target = await this.selectSpecificItem();
        }

        await this.confirmAndExecute(operation, target);
    }

    async selectSpecificItem() {
        const config = this.configManager.folderMapping || this.configManager.loadFolderMappingSync();
        const availableItems = Object.keys(config.items);

        logger.info('\n📋 Available items:');
        availableItems.forEach((item, index) => {
            const description = config.items[item].description;
            logger.info(`   ${index + 1}. ${item} - ${description}`);
        });

        const choice = await this.askQuestion('Enter item name or number: ');
        const itemIndex = parseInt(choice.trim()) - 1;

        if (!isNaN(itemIndex) && itemIndex >= 0 && itemIndex < availableItems.length) {
            return availableItems[itemIndex];
        }

        if (availableItems.includes(choice.trim())) {
            return choice.trim();
        }

        logger.warn('❌ Invalid item, please try again');
        return await this.selectSpecificItem();
    }

    async confirmAndExecute(operation, target) {
        logger.info(`\n📋 Summary:`);
        logger.info(`   Operation: ${operation}`);
        logger.info(`   Target: ${target}`);

        const confirmed = await this.askQuestion('\nConfirm execution? (y/n): ');
        if (['y', 'yes'].includes(confirmed.toLowerCase())) {
            await this.executeOperation(operation, target);
        } else {
            logger.info('❌ Operation cancelled');
        }
    }

    async executeOperation(operation, target) {
        try {
            switch (operation) {
                case DOWNLOAD:
                    await this.executeDownload(target);
                    break;
                case COPY:
                    await this.executeCopy(target);
                    break;
                case FULL:
                    logger.info('🔄 Starting full workflow...');
                    await this.executeDownload(target);
                    logger.info('📋 Download completed, starting copy...');
                    await this.executeCopy(target);
                    logger.success('✅ Full workflow completed!');
                    break;
            }
        } catch (error) {
            logger.error(`❌ Operation failed: ${error.message}`);
        }
    }

    async executeDownload(target) {
        logger.info(`📥 Starting download for target: ${target}`);
        const downloader = new FastBulkDownloader({ detail: false });
        await downloader.initialize();

        const itemsToProcess = this.configManager.getItemsToProcess(target);
        if (itemsToProcess.length === 0) {
            logger.info('ℹ️  No items to process');
            return;
        }

        downloader.downloadStats.startTime = Date.now();

        for (const itemName of itemsToProcess) {
            try {
                await downloader.downloadItem(itemName);
            } catch (error) {
                logger.error(`❌ Download failed ${itemName}:`, error.message);
                downloader.downloadStats.failed++;
            }
        }

        downloader.showFinalStats();
    }

    async executeCopy(target) {
        logger.info(`📋 Starting copy/sync for target: ${target}`);
        const options = { type: target };
        const synchronizer = new FileSynchronizer(options);
        await synchronizer.run();
    }

    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async askSelect(question, validOptions) {
        const answer = await this.askQuestion(question);
        if (validOptions.includes(answer)) return answer;
        logger.warn('❌ Invalid input, please try again');
        return await this.askSelect(question, validOptions);
    }

    async promptTexturePacker() {
        logger.info('\n🔄 Starting texture packer...');
        // 傳入主 CLI 的 readline 介面，避免衝突
        const texturePacker = new TexturePackerCLI(this.rl);
        await texturePacker.run();
    }

    async executeSymbolChecker() {
        logger.info('\n🔍 Starting symbol checker...');
        const { spawn } = require('child_process');
        const path = require('path');
        
        return new Promise((resolve, reject) => {
            const process = spawn('node', ['src/scripts/symbol-checker-cli.js'], {
                stdio: 'inherit',
                cwd: path.resolve(__dirname, '../..')
            });

            process.on('close', (code) => {
                if (code === 0) {
                    logger.success('✅ Symbol checker completed successfully');
                    resolve();
                } else {
                    logger.error(`❌ Symbol checker failed with code ${code}`);
                    reject(new Error(`Process exited with code ${code}`));
                }
            });

            process.on('error', (error) => {
                logger.error(`❌ Symbol checker error: ${error.message}`);
                reject(error);
            });
        });
    }

    async promptFontBitmapHandler() {
        logger.info('\n🔤 Font Bitmap Handler:');
        logger.info('   1. shoebox-auto - Run shoebox automation');
        logger.info('   2. get-height   - Get height information');

        const choice = await this.askSelect('Please select option (1-2): ', ['1', '2']);
        
        if (choice === '1') {
            await this.executeShoeboxAuto();
        } else if (choice === '2') {
            await this.executeGetHeight();
        }
    }

    async executeShoeboxAuto() {
        logger.info('\n📦 Starting shoebox auto...');
        const { spawn } = require('child_process');
        const path = require('path');
        
        return new Promise((resolve, reject) => {
            // 設定正確的工作目錄為 shoebox-auto 資料夾
            const shoeboxAutoDir = path.resolve(__dirname, 'shoebox-auto');
            const scriptPath = './run-with-interrupt.sh';
            
            const process = spawn(scriptPath, ['all'], {
                stdio: 'inherit',
                cwd: shoeboxAutoDir,
                shell: true
            });

            process.on('close', (code) => {
                if (code === 0) {
                    logger.success('✅ Shoebox auto completed successfully');
                    resolve();
                } else {
                    logger.error(`❌ Shoebox auto failed with code ${code}`);
                    reject(new Error(`Process exited with code ${code}`));
                }
            });

            process.on('error', (error) => {
                logger.error(`❌ Shoebox auto error: ${error.message}`);
                reject(error);
            });
        });
    }

    async executeGetHeight() {
        logger.info('\n📏 Starting get height...');
        const { spawn } = require('child_process');
        const path = require('path');
        
        return new Promise((resolve, reject) => {
            // 直接執行 get-height.js 腳本
            const scriptPath = path.resolve(__dirname, 'shoebox-auto', 'get-height.js');
            
            const process = spawn('node', [scriptPath], {
                stdio: 'inherit',
                cwd: path.resolve(__dirname, '../..'),
                shell: true
            });

            process.on('close', (code) => {
                if (code === 0) {
                    logger.success('✅ Get height completed successfully');
                    resolve();
                } else {
                    logger.error(`❌ Get height failed with code ${code}`);
                    reject(new Error(`Process exited with code ${code}`));
                }
            });

            process.on('error', (error) => {
                logger.error(`❌ Get height error: ${error.message}`);
                reject(error);
            });
        });
    }
}

async function main() {
    const cli = new AssetsAutomationCLI();
    await cli.run();
}

if (require.main === module) {
    main();
}

module.exports = AssetsAutomationCLI;
