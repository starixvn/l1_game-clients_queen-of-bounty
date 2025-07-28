const readline = require('readline');
const { FileSynchronizer } = require('./move-assets');
const FastBulkDownloader = require('./download-tool');
const { ConfigManager } = require('../utils/common');
const { logger } = require('../utils/logger');

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
        logger.info('   1. download  - Download assets from Google Drive');
        logger.info('   2. copytype  - Copy/sync downloaded assets to project');
        logger.info('   3. full      - Download + Copy (complete workflow)');

        const choice = await this.askSelect('Please select operation (1-3): ', ['1', '2', '3', 'download', 'copytype', 'full']);
        const operationMap = {
            '1': 'download',
            '2': 'copytype',
            '3': 'full',
            'download': 'download',
            'copytype': 'copytype',
            'full': 'full'
        };
        const operation = operationMap[choice];
        await this.promptTargetSelection(operation);
    }

    async promptTargetSelection(operation) {
        logger.info(`\n📦 Select target for ${operation}:`);
        logger.info('   1. all       - Process all assets');
        logger.info('   2. 2d        - Process 2D assets only');
        logger.info('   3. 3d        - Process 3D assets only');
        logger.info('   4. specific  - Specify a particular item');

        const choice = await this.askSelect('Please select target (1-4): ', ['1', '2', '3', '4', 'all', '2d', '3d', 'specific']);

        let target = 'all';
        const targetMap = {
            '1': 'all',
            '2': '2d',
            '3': '3d',
            '4': 'specific',
            'all': 'all',
            '2d': '2d',
            '3d': '3d',
            'specific': 'specific'
        };

        target = targetMap[choice];

        if (target === 'specific') {
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
                case 'download':
                    await this.executeDownload(target);
                    break;
                case 'copytype':
                    await this.executeCopytype(target);
                    break;
                case 'full':
                    logger.info('🔄 Starting full workflow...');
                    await this.executeDownload(target);
                    logger.info('📋 Download completed, starting copy...');
                    await this.executeCopytype(target);
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

    async executeCopytype(target) {
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
}

async function main() {
    const cli = new AssetsAutomationCLI();
    await cli.run();
}

if (require.main === module) {
    main();
}

module.exports = AssetsAutomationCLI;
