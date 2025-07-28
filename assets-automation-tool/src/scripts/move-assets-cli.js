const readline = require('readline');
const { FileSynchronizer } = require('./move-assets');
const { ConfigManager } = require('../utils/common');
const { logger } = require('../utils/logger');

class MoveBatchCLI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.configManager = ConfigManager.getInstance();
    }

    async run() {
        try {
            logger.info('🎮 Welcome to Move Assets CLI Tool!');
            
            await this.configManager.loadFolderMapping();
            logger.success('✅ Configuration loaded successfully');
            
            await this.selectSyncOptions();
            
        } catch (error) {
            logger.error(`❌ Error: ${error.message}`);
        } finally {
            this.rl.close();
        }
    }

    async selectSyncOptions() {
        logger.info('\n🔄 Select sync options:');
        logger.info('   1. all  - Sync all folders');
        logger.info('   2. 2d   - Sync 2D assets only');
        logger.info('   3. 3d   - Sync 3D assets only');
        logger.info('   4. [item-name] - Specify particular item');

        const choice = await this.askQuestion('Please select (1-3 or enter item name): ');
        
        let syncType = 'all';

        switch (choice.trim().toLowerCase()) {
            case '1':
            case 'all':
                syncType = 'all';
                break;
                
            case '2':
            case '2d':
                syncType = '2d';
                break;
                
            case '3':
            case '3d':
                syncType = '3d';
                break;
                
            default:
                syncType = choice.trim();
        }

        logger.info(`Starting sync: ${syncType}`);
        
        const confirmed = await this.askQuestion('Confirm execution? (y/n): ');
        
        if (confirmed.toLowerCase() === 'y' || confirmed.toLowerCase() === 'yes') {
            await this.executeSync(syncType);
        } else {
            logger.info('❌ Sync operation cancelled');
        }
    }

    async executeSync(syncType) {
        try {
            const options = { type: syncType };
            
            const synchronizer = new FileSynchronizer(options);
            await synchronizer.run();
            
        } catch (error) {
            logger.error(`❌ Sync failed: ${error.message}`);
        }
    }

    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }
}

async function main() {
    const cli = new MoveBatchCLI();
    await cli.run();
}

if (require.main === module) {
    main();
}

module.exports = MoveBatchCLI; 