#!/usr/bin/env node
/**
 * 交互式文件同步 CLI 工具
 * 提供用戶友好的界面來配置和執行文件同步操作
 */

const readline = require('readline');
const fs = require('fs');
const { FileSynchronizer, BaseConfigManager } = require('./move-assets');

class MoveBatchCLI extends BaseConfigManager {
    constructor() {
        super(); // 調用 BaseConfigManager 的 constructor
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async run() {
        try {
            await this.initCLI();
            console.log(this.i18n.t('welcome') + '\n');
            
            await this.confirmPaths();
            await this.selectSyncOptions();
            
        } catch (error) {
            console.error(this.i18n ? this.i18n.t('errors.general', { error: error.message }) : `❌ 錯誤: ${error.message}`);
        } finally {
            this.rl.close();
        }
    }

    async initCLI() {
        await this.loadConfigAndInitI18n();
        console.log(this.i18n.t('config.loaded'));
    }

    async confirmPaths() {
        console.log(this.i18n.t('paths.title'));
        console.log(this.i18n.t('paths.sourceFolder', { 
            path: this.config.sourceFolder || this.i18n.t('paths.notSet')
        }));
        console.log(this.i18n.t('paths.projectRoot', { 
            path: this.config.projectRoot || this.i18n.t('paths.notSet')
        }) + '\n');

        // 如果路徑為空，強制要求用戶更新
        if (!this.config.sourceFolder || !this.config.projectRoot) {
            console.log(this.i18n.t('paths.needSetup'));
            await this.updatePaths();
            return;
        }

        const confirmed = await this.askValidatedQuestion(this.i18n.t('paths.confirm'), (answer) => {
            const lower = answer.toLowerCase().trim();
            return ['y', 'yes', 'n', 'no'].includes(lower);
        }, this.i18n.t('validation.invalidYesNo'));
        
        if (confirmed.toLowerCase() !== 'y' && confirmed.toLowerCase() !== 'yes') {
            await this.updatePaths();
        }
    }

    async updatePaths() {
        console.log('\n' + this.i18n.t('paths.updateTitle'));
        
        const isFirstSetup = !this.config.sourceFolder || !this.config.projectRoot;
        
        if (isFirstSetup) {
            console.log(this.i18n.t('paths.firstSetup') + '\n');
        } else {
            console.log(this.i18n.t('paths.hint') + '\n');
        }

        // 來源資料夾
        if (isFirstSetup || !this.config.sourceFolder) {
            this.config.sourceFolder = await this.askValidatedQuestion(this.i18n.t('paths.sourceFolderPrompt'), (answer) => {
                return answer.trim().length > 0;
            }, this.i18n.t('validation.emptySourcePath'));
        } else {
            const newSourceFolder = await this.askQuestion(this.i18n.t('paths.sourceFolderCurrent', { 
                current: this.config.sourceFolder 
            }));
            if (newSourceFolder.trim()) {
                this.config.sourceFolder = newSourceFolder.trim();
            }
        }

        // 專案根目錄
        if (isFirstSetup || !this.config.projectRoot) {
            this.config.projectRoot = await this.askValidatedQuestion(this.i18n.t('paths.projectRootPrompt'), (answer) => {
                return answer.trim().length > 0;
            }, this.i18n.t('validation.emptyProjectPath'));
        } else {
            const newProjectRoot = await this.askQuestion(this.i18n.t('paths.projectRootCurrent', { 
                current: this.config.projectRoot 
            }));
            if (newProjectRoot.trim()) {
                this.config.projectRoot = newProjectRoot.trim();
            }
        }

        // 驗證路徑是否存在
        if (!fs.existsSync(this.config.sourceFolder)) {
            console.log(this.i18n.t('paths.sourceNotExists'));
        }
        if (!fs.existsSync(this.config.projectRoot)) {
            console.log(this.i18n.t('paths.projectNotExists'));
        }

        await this.saveConfig();
        console.log(this.i18n.t('paths.updated') + '\n');
    }

    async selectSyncOptions() {
        console.log(this.i18n.t('sync.title'));
        console.log(this.i18n.t('sync.option1'));
        console.log(this.i18n.t('sync.option2'));
        console.log(this.i18n.t('sync.option3'));
        console.log(this.i18n.t('sync.option4') + '\n');

        const choice = await this.askValidatedQuestion(this.i18n.t('sync.prompt'), (answer) => {
            const input = answer.trim().toLowerCase();
            return ['1', '2', '3', '4', 'all', '2d', '3d', 'folder'].includes(input) || 
                   input.length > 0; // 允許任何非空輸入作為資料夾名稱
        }, this.i18n.t('validation.invalidChoice'));
        
        let syncType = 'all';
        let targetFolder = null;

        // 處理用戶選擇
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
                targetFolder = await this.askValidatedQuestion(this.i18n.t('sync.folderPrompt'), (answer) => {
                    return answer.trim().length > 0;
                }, this.i18n.t('validation.emptyFolder'));
                break;
            default:
                // 嘗試直接使用輸入作為類型
                if (['all', '2D', '3D'].includes(choice.trim())) {
                    syncType = choice.trim();
                } else {
                    // 假設是資料夾名稱
                    syncType = 'folder';
                    targetFolder = choice.trim();
                }
        }

        const folderText = targetFolder ? ` (${targetFolder})` : '';
        console.log('\n' + this.i18n.t('sync.starting', { type: syncType, folder: folderText }));
        
        const confirmed = await this.askValidatedQuestion(this.i18n.t('sync.confirm'), (answer) => {
            const lower = answer.toLowerCase().trim();
            return ['y', 'yes', 'n', 'no'].includes(lower);
        }, this.i18n.t('validation.invalidYesNo'));
        
        if (confirmed.toLowerCase() === 'y' || confirmed.toLowerCase() === 'yes') {
            await this.executSync(syncType, targetFolder);
        } else {
            console.log(this.i18n.t('sync.cancelled'));
        }
    }

    async executSync(syncType, targetFolder) {
        try {
            // 創建同步器實例，傳入配置
            const options = { 
                type: syncType, 
                folder: targetFolder,
                config: this.config,
                i18n: this.i18n
            };
            
            const synchronizer = new FileSynchronizer(options);
            await synchronizer.run();
            
        } catch (error) {
            console.error(this.i18n.t('sync.failed', { error: error.message }));
        }
    }

    askQuestion(question) {
        return super.askQuestion(question, this.rl);
    }

    async askValidatedQuestion(question, validator, errorMessage) {
        return super.askValidatedQuestion(question, validator, errorMessage, this.rl);
    }
}

// === 主程序 ===
async function main() {
    const cli = new MoveBatchCLI();
    await cli.run();
}

if (require.main === module) {
    main();
}

module.exports = MoveBatchCLI; 