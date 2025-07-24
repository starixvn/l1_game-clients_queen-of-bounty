const readline = require('readline');
const fs = require('fs');
const { FileSynchronizer, ConfigManager } = require('./move-assets');
const { logger } = require('../utils/logger');

class MoveBatchCLI extends ConfigManager {
    constructor() {
        super();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async run() {
        try {
            await this.initCLI();
            logger.info('🎮 Welcome to Move Assets CLI Tool!');
            
            await this.confirmPaths();
            await this.selectSyncOptions();
            
        } catch (error) {
            logger.error(`❌ Error: ${error.message}`);
        } finally {
            this.rl.close();
        }
    }

    async initCLI() {
        await this.loadConfig();
        logger.success('✅ Configuration file loaded successfully');
    }

    async confirmPaths() {
        logger.info('📁 Current path configuration:');
        logger.info(`   Source folder: ${this.config.sourceFolder || '(not set)'}`);
        logger.info(`   Project root: ${this.config.projectRoot || '(not set)'}`);

        if (!this.config.sourceFolder || !this.config.projectRoot) {
            logger.warn('⚠️ Found unset paths, need to configure paths before continuing');
            await this.updatePaths();
            return;
        }

        const confirmed = await this.askValidatedQuestion(
            'Are the paths correct? (y/n): ', 
            (answer) => {
                const lower = answer.toLowerCase().trim();
                return ['y', 'yes', 'n', 'no'].includes(lower);
            }, 
            '❌ Please enter y or n'
        );
        
        if (confirmed.toLowerCase() !== 'y' && confirmed.toLowerCase() !== 'yes') {
            await this.updatePaths();
        }
    }

    async updatePaths() {
        logger.info('🔧 Update path configuration:');
        
        const isFirstSetup = !this.config.sourceFolder || !this.config.projectRoot;
        
        if (isFirstSetup) {
            logger.info('🆕 Initial setup, please enter complete paths:');
        } else {
            logger.info('💡 Tip: Press Enter directly to keep current value');
        }

        if (isFirstSetup || !this.config.sourceFolder) {
            this.config.sourceFolder = await this.askValidatedQuestion(
                'Source folder: ', 
                (answer) => answer.trim().length > 0,
                '❌ Source folder path cannot be empty'
            );
        } else {
            const newSourceFolder = await this.askQuestion(
                `Source folder [${this.config.sourceFolder}]: `
            );
            if (newSourceFolder.trim()) {
                this.config.sourceFolder = newSourceFolder.trim();
            }
        }

        if (isFirstSetup || !this.config.projectRoot) {
            this.config.projectRoot = await this.askValidatedQuestion(
                'Project root: ', 
                (answer) => answer.trim().length > 0,
                '❌ Project root path cannot be empty'
            );
        } else {
            const newProjectRoot = await this.askQuestion(
                `Project root [${this.config.projectRoot}]: `
            );
            if (newProjectRoot.trim()) {
                this.config.projectRoot = newProjectRoot.trim();
            }
        }

        if (!fs.existsSync(this.config.sourceFolder)) {
            logger.warn('⚠️ Warning: Source folder does not exist');
        }
        if (!fs.existsSync(this.config.projectRoot)) {
            logger.warn('⚠️ Warning: Project root directory does not exist');
        }

        await this.saveConfig();
        logger.success('✅ Path configuration updated');
    }

    async selectSyncOptions() {
        logger.info('🔄 Select sync options:');
        logger.info('   1. all  - Sync all folders');
        logger.info('   2. 2D   - Sync 2D assets only');
        logger.info('   3. 3D   - Sync 3D assets only');
        logger.info('   4. folder - Specify particular folder');

        const choice = await this.askValidatedQuestion(
            'Please select (1-4 or enter type name directly): ', 
            (answer) => {
                const input = answer.trim().toLowerCase();
                return ['1', '2', '3', '4', 'all', '2d', '3d', 'folder'].includes(input) || 
                       input.length > 0;
            }, 
            '❌ Please enter 1-4 number, type name or folder name'
        );
        
        let syncType = 'all';
        let targetFolder = null;

        switch (choice.trim().toLowerCase()) {
            case '1':
            case 'all':
                syncType = 'all';
                break;
                
            case '2':
            case '2d':
                syncType = '2D';
                break;
                
            case '3':
            case '3d':
                syncType = '3D';
                break;
                
            case '4':
            case 'folder':
                syncType = 'folder';
                targetFolder = await this.askValidatedQuestion(
                    'Please enter folder name: ', 
                    (answer) => answer.trim().length > 0,
                    '❌ Folder name cannot be empty'
                );
                break;
                
            default:
                if (['all', '2D', '3D'].includes(choice.trim())) {
                    syncType = choice.trim();
                } else {
                    syncType = 'folder';
                    targetFolder = choice.trim();
                }
        }

        const folderText = targetFolder ? ` (${targetFolder})` : '';
        logger.info(`Starting sync: ${syncType}${folderText}`);
        
        const confirmed = await this.askValidatedQuestion(
            'Confirm execution? (y/n): ', 
            (answer) => {
                const lower = answer.toLowerCase().trim();
                return ['y', 'yes', 'n', 'no'].includes(lower);
            }, 
            '❌ Please enter y or n'
        );
        
        if (confirmed.toLowerCase() === 'y' || confirmed.toLowerCase() === 'yes') {
            await this.executSync(syncType, targetFolder);
        } else {
            logger.info('❌ Sync operation cancelled');
        }
    }

    async executSync(syncType, targetFolder) {
        try {
            const options = { 
                type: syncType, 
                folder: targetFolder,
                config: this.config
            };
            
            const synchronizer = new FileSynchronizer(options);
            await synchronizer.run();
            
        } catch (error) {
            logger.error(`❌ Sync failed: ${error.message}`);
        }
    }

    askQuestion(question) {
        return super.askQuestion(question, this.rl);
    }

    async askValidatedQuestion(question, validator, errorMessage) {
        return super.askValidatedQuestion(question, validator, errorMessage, this.rl);
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