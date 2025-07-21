#!/usr/bin/env node
/**
 * File Synchronization Tool - Sync folder contents to Cocos Creator project
 * Read folder-mapping.json → Copy files → Clean up .meta files
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const I18n = require('./i18n/i18n');

// Utility functions
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// === Shared Config and i18n Management Class ===
class BaseConfigManager {
    constructor(configPath = null) {
        this.configPath = configPath || path.join(__dirname, 'config.json');
        this.config = null;
        this.i18n = null;
    }

    async loadConfigAndInitI18n() {
        // Load configuration file
        try {
            const data = await readFile(this.configPath, 'utf8');
            this.config = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Configuration file not found: ${this.configPath}. Please create config.json first.`);
            } else {
                throw new Error(`Configuration file format error: ${error.message}`);
            }
        }

        // Initialize i18n
        const language = this.config?.language || 'en';
        this.i18n = new I18n(language, path.join(__dirname, 'i18n'));
        await this.i18n.init();
        
        return { config: this.config, i18n: this.i18n };
    }

    async saveConfig(config = null) {
        const configToSave = config || this.config;
        if (!configToSave) {
            throw new Error('No config to save');
        }
        
        try {
            await writeFile(this.configPath, JSON.stringify(configToSave, null, 4), 'utf8');
            if (this.i18n) {
                console.log(this.i18n.t('config.saved'));
            } else {
                console.log('✅ Configuration saved');
            }
        } catch (error) {
            throw new Error(`Cannot save configuration file: ${error.message}`);
        }
    }

    static async createInstance(configPath = null) {
        const manager = new BaseConfigManager(configPath);
        await manager.loadConfigAndInitI18n();
        return manager;
    }

    // Generic input handling methods (for CLI use)
    askQuestion(question, rl) {
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    async askValidatedQuestion(question, validator, errorMessage, rl) {
        while (true) {
            const answer = await this.askQuestion(question, rl);
            
            if (validator(answer)) {
                return answer;
            }
            
            console.log(errorMessage);
            const retryMsg = this.i18n ? 
                this.i18n.t('validation.retryInput') : 
                'Please try again.';
            console.log(retryMsg + '\n');
        }
    }
}

class FileSynchronizer {
    constructor(options = {}) {
        this.operationLog = [];
        this.folderMapping = null;
        this.copyType = options.type || 'all';
        this.targetFolder = options.folder || null;
        
        // 配置必須從外部傳入
        if (!options.config) {
            throw new Error('Must provide config parameter');
        }
        this.CONFIG = options.config;
        this.i18n = options.i18n || null;
    }



    // === Core functionality ===
    async run() {
        const startMsg = this.i18n ? 
            `🚀 ${this.i18n.t('sync.starting', { 
                type: this.copyType, 
                folder: this.targetFolder ? ': ' + this.targetFolder : '' 
            })}...` :
            `🚀 開始同步 [${this.copyType}${this.targetFolder ? ': ' + this.targetFolder : ''}]...`;
        console.log(startMsg);
        
        await this._loadMapping();
        
        const folderCount = Object.keys(this.folderMapping).length;
        if (folderCount === 0) {
            const noFolderMsg = this.i18n ? 
                this.i18n.t('sync.noFolders') :
                "⚠️ 沒有找到要同步的資料夾";
            console.log(noFolderMsg);
            return;
        }
        
        const syncingMsg = this.i18n ?
            `📁 ${this.i18n.t('sync.willSync', { count: folderCount })}` :
            `📁 將同步 ${folderCount} 個資料夾`;
        console.log(syncingMsg);
        
        await this._syncAllFolders();
        this._showResults();
        
        const completedMsg = this.i18n ?
            this.i18n.t('sync.completed', { count: this.operationLog.length }) :
            `✅ 完成！共 ${this.operationLog.length} 個操作`;
        console.log(`\n${completedMsg}`);
    }

    async syncFolder(sourcePath, destinationPath) {
        if (!await this._validateAndPrepare(sourcePath, destinationPath)) {
            return;
        }

        const items = await readdir(sourcePath);
        
        for (const item of items) {
            if (this._shouldSkip(item)) {
                this._log("⏭️", "跳過", path.join(sourcePath, item));
                continue;
            }
            
            await this._processItem(item, sourcePath, destinationPath);
        }
    }



    // === Private methods ===
    async _loadMapping() {
        try {
            const mappingPath = path.resolve(__dirname, this.CONFIG.mappingFile);
            const data = await readFile(mappingPath, 'utf8');
            const config = JSON.parse(data);
            
            // 根據 copyType 篩選要同步的資料夾
            this.folderMapping = this._filterMapping(config);
        } catch (error) {
            const message = error.code === 'ENOENT' 
                ? `找不到 ${this.CONFIG.mappingFile}` 
                : `配置文件錯誤: ${error.message}`;
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
                // Search for specified folder in all categories
                for (const categoryMapping of Object.values(categories)) {
                    if (categoryMapping[this.targetFolder]) {
                        return { [this.targetFolder]: categoryMapping[this.targetFolder] };
                    }
                }
                throw new Error(`Folder not found: ${this.targetFolder}`);
                
            case 'all':
            default:
                // Merge all categories
                return Object.values(categories).reduce((all, category) => {
                    return { ...all, ...category };
                }, {});
        }
    }

    async _syncAllFolders() {
        for (const [key, destPath] of Object.entries(this.folderMapping)) {
            const sourcePath = path.join(this.CONFIG.sourceFolder, key);
            const fullDestPath = path.join(this.CONFIG.projectRoot, destPath);
            
            console.log(`\n📂 ${key} -> ${destPath}`);
            await this.syncFolder(sourcePath, fullDestPath);
        }
    }

    async _validateAndPrepare(sourcePath, destinationPath) {
        // Check source
        try {
            const sourceStats = await stat(sourcePath);
            if (!sourceStats.isDirectory()) {
                this._log("⚠️", "Source is not a directory", sourcePath);
                return false;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                this._log("⚠️", "Source does not exist", sourcePath);
                return false;
            }
            throw error;
        }

        // Create target directory
        try {
            await mkdir(destinationPath, { recursive: true });
            this._log("📁", "Create directory", "", destinationPath);
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
            console.error(`❌ Error processing file: ${sourceItem}`, error.message);
        }
    }

    async _copyFileAndCleanup(sourceItem, destItem) {
        await copyFile(sourceItem, destItem);
        this._log("✅", "複製文件", sourceItem, destItem);
        
        // 清理 .meta 文件
        const metaFile = destItem + ".meta";
        try {
            await unlink(metaFile);
            this._log("🗑️", "刪除 .meta", "", metaFile);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }

    _shouldSkip(itemName) {
        return this.CONFIG.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(itemName);
            }
            if (pattern.includes('?')) {
                const regex = new RegExp('^' + pattern.replace(/\?/g, '.') + '$');
                return regex.test(itemName);
            }
            return itemName === pattern;
        });
    }

    _log(status, operation, source = "", destination = "") {
        this.operationLog.push([status, operation, source, destination]);
    }

    _showResults() {
        if (this.operationLog.length === 0) return;

        const title = this.i18n ? this.i18n.t('results.title') : "📊 操作結果";
        console.log("\n" + "=".repeat(50));
        console.log(title);
        console.log("=".repeat(50));
        
        // 簡化的結果顯示，逐行輸出
        this.operationLog.forEach(([status, operation, source, target]) => {
            const sourcePath = source ? ` ${source}` : '';
            const targetPath = target ? ` → ${target}` : '';
            console.log(`${status} ${operation}${sourcePath}${targetPath}`);
        });
        
        console.log("=".repeat(50));
    }
}

// === 主程序 ===
function showHelp() {
    console.log(`
File Synchronization Tool - Usage Guide

Usage: node move-assets.js [options]

Options:
  --type <type>     Sync type: all | 2D | 3D (default: all)
  --folder <name>   Specify folder name (sync single folder directly)
  --help           Show this help message

Examples:
  node move-assets.js                    # Sync all folders
  node move-assets.js --type 2D          # Sync 2D assets only
  node move-assets.js --type 3D          # Sync 3D assets only
  node move-assets.js --folder mascot    # Sync mascot folder only
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
            case '--type':
            case '-t':
                if (i + 1 < args.length) {
                    options.type = args[++i];
                    if (!['all', '2D', '3D'].includes(options.type)) {
                                            console.error(`❌ Invalid type: ${options.type}`);
                    process.exit(1);
                    }
                }
                break;
            case '--folder':
            case '-f':
                if (i + 1 < args.length) {
                    options.folder = args[++i];
                    options.type = 'folder';  // 自動設定為 folder 模式
                }
                break;
            default:
                console.error(`❌ Unknown parameter: ${args[i]}`);
                showHelp();
                process.exit(1);
        }
    }
    
    return options;
}

async function main() {
    try {
        const options = parseArgs();
        
        // 使用共用的配置管理器
        let configManager;
        try {
            configManager = await BaseConfigManager.createInstance();
        } catch (error) {
            if (error.message.includes('Configuration file not found')) {
                console.error('❌ config.json configuration file not found');
                console.error('Please use interactive CLI tool: npm run cli');
            } else {
                console.error(`❌ Configuration error: ${error.message}`);
            }
            process.exit(1);
        }
        
        const i18nMsg = configManager.i18n ? 
            configManager.i18n.t('config.loaded') : 
            '✅ Configuration file loaded successfully';
        console.log(i18nMsg);
        
        options.config = configManager.config;
        options.i18n = configManager.i18n;
        const synchronizer = new FileSynchronizer(options);
        await synchronizer.run();
    } catch (error) {
        if (error.code === 'SIGINT') {
            console.log("\n⚠️ Interrupted");
        } else {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    }
}

process.on('SIGINT', () => {
    console.log("\n⚠️ Interrupted");
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = { FileSynchronizer, BaseConfigManager };