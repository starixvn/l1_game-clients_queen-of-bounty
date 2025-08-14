const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * 可擴充的資源檢查系統
 * 每個資料夾可以有自己的檢查規則
 */

/**
 * 基礎檢查器類別
 */
class BaseChecker {
    constructor(name, basePath) {
        this.name = name;
        this.basePath = basePath;
        this.errors = [];
        this.warnings = [];
    }

    /**
     * 主要檢查方法，需要子類別實作
     */
    async check() {
        throw new Error('check() method must be implemented by subclass');
    }

    /**
     * 添加錯誤
     */
    addError(message) {
        this.errors.push(message);
        logger.error(`[${this.name}] ${message}`);
    }

    /**
     * 添加警告
     */
    addWarning(message) {
        this.warnings.push(message);
        logger.warn(`[${this.name}] ${message}`);
    }

    /**
     * 檢查檔案是否存在
     */
    fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }

    /**
     * 讀取JSON檔案
     */
    readJsonFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            this.addError(`無法讀取JSON檔案 ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * 讀取文字檔案
     */
    readTextFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            this.addError(`無法讀取檔案 ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * 取得檢查結果
     */
    getResult() {
        return {
            name: this.name,
            success: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
            errorCount: this.errors.length,
            warningCount: this.warnings.length
        };
    }
}

/**
 * Symbol Spines 檢查器
 */
class SymbolSpinesChecker extends BaseChecker {
    constructor(basePath) {
        super('Symbol Spines', basePath);
        this.symbolSpinesPath = path.join(basePath, 'src/assets/resources/symbol-spines');
    }

    async check() {
        logger.info(`開始檢查 Symbol Spines 資源...`);
        
        // 檢查資料夾是否存在
        if (!this.fileExists(this.symbolSpinesPath)) {
            this.addError(`Symbol spines 資料夾不存在: ${this.symbolSpinesPath}`);
            return;
        }

        // 檢查 symbol JSON 檔案 (symbol-0.json 到 symbol-13.json)
        await this.checkSymbolJsonFiles();

        // 檢查 symbol.atlas 和 symbol.webp
        await this.checkAtlasAndTexture();

        logger.info(`Symbol Spines 檢查完成`);
    }

    /**
     * 檢查 symbol JSON 檔案
     */
    async checkSymbolJsonFiles() {
        // 檢查 symbol-0.json 到 symbol-9.json (需要 explode, highlight, idle)
        for (let i = 0; i <= 9; i++) {
            const fileName = `symbol-${i}.json`;
            const filePath = path.join(this.symbolSpinesPath, fileName);
            
            if (!this.fileExists(filePath)) {
                this.addError(`檔案不存在: ${fileName}`);
                continue;
            }

            const requiredAnimations = ['explode', 'highlight', 'idle'];
            this.checkAnimations(filePath, fileName, requiredAnimations);
        }

        // 檢查 symbol-10.json 到 symbol-13.json (需要 highlight, idle)
        for (let i = 10; i <= 13; i++) {
            const fileName = `symbol-${i}.json`;
            const filePath = path.join(this.symbolSpinesPath, fileName);
            
            if (!this.fileExists(filePath)) {
                this.addError(`檔案不存在: ${fileName}`);
                continue;
            }

            const requiredAnimations = ['highlight', 'idle'];
            this.checkAnimations(filePath, fileName, requiredAnimations);
        }
    }

    /**
     * 檢查動畫是否存在
     */
    checkAnimations(filePath, fileName, requiredAnimations) {
        const jsonData = this.readJsonFile(filePath);
        if (!jsonData) return;

        if (!jsonData.animations) {
            this.addError(`${fileName} 缺少 animations 部分`);
            return;
        }

        const existingAnimations = Object.keys(jsonData.animations);
        
        for (const requiredAnimation of requiredAnimations) {
            if (!existingAnimations.includes(requiredAnimation)) {
                this.addError(`${fileName} 缺少動畫: ${requiredAnimation}`);
            }
        }

        // 檢查是否有多餘的動畫
        for (const existingAnimation of existingAnimations) {
            if (!requiredAnimations.includes(existingAnimation)) {
                this.addWarning(`${fileName} 包含額外的動畫: ${existingAnimation}`);
            }
        }
    }

    /**
     * 檢查 atlas 和 texture 檔案
     */
    async checkAtlasAndTexture() {
        const atlasPath = path.join(this.symbolSpinesPath, 'symbol.atlas');
        const texturePath = path.join(this.symbolSpinesPath, 'symbol.webp');

        // 檢查 symbol.atlas 是否存在
        if (!this.fileExists(atlasPath)) {
            this.addError('symbol.atlas 檔案不存在');
            return;
        }

        // 檢查 symbol.webp 是否存在
        if (!this.fileExists(texturePath)) {
            this.addError('symbol.webp 檔案不存在');
        }

        // 檢查 atlas 檔案是否包含 symbol.webp 字串
        const atlasContent = this.readTextFile(atlasPath);
        if (atlasContent && !atlasContent.includes('symbol.webp')) {
            this.addError('symbol.atlas 檔案中未找到 symbol.webp 字串');
        }
    }
}

/**
 * 範例: 音效檔案檢查器 (示範如何擴充系統)
 * 取消註解並修改邏輯即可使用
 */
/*
class AudioChecker extends BaseChecker {
    constructor(basePath) {
        super('Audio Files', basePath);
        this.audioPath = path.join(basePath, 'src/assets/resources/audios');
    }

    async check() {
        logger.info(`開始檢查音效檔案...`);
        
        if (!this.fileExists(this.audioPath)) {
            this.addError(`音效資料夾不存在: ${this.audioPath}`);
            return;
        }

        // 檢查必要的音效檔案
        const requiredAudioFiles = [
            'background-music.mp3',
            'big-win-increment-ended.mp3',
            // 添加其他必要的音效檔案...
        ];

        for (const audioFile of requiredAudioFiles) {
            const filePath = path.join(this.audioPath, audioFile);
            if (!this.fileExists(filePath)) {
                this.addError(`音效檔案不存在: ${audioFile}`);
            }
        }

        logger.info(`音效檔案檢查完成`);
    }
}
*/

/**
 * 主要檢查函數
 */
async function checkAssets(basePath = process.cwd()) {
    logger.info('開始資源檢查...');
    
    const checkers = [
        new SymbolSpinesChecker(basePath)
        // 要添加新的檢查器，只需要將其加入此陣列:
        // new AudioChecker(basePath),
        // new YourCustomChecker(basePath)
    ];

    const results = [];

    for (const checker of checkers) {
        try {
            await checker.check();
            results.push(checker.getResult());
        } catch (error) {
            logger.error(`檢查器 ${checker.name} 發生錯誤: ${error.message}`);
            checker.addError(`檢查器執行失敗: ${error.message}`);
            results.push(checker.getResult());
        }
    }

    // 輸出總結
    logger.info('='.repeat(50));
    logger.info('資源檢查總結:');
    
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
        totalErrors += result.errorCount;
        totalWarnings += result.warningCount;
        
        const status = result.success ? '✅ 通過' : '❌ 失敗';
        logger.info(`${result.name}: ${status} (錯誤: ❌ ${result.errorCount}, 警告: ⚠️ ${result.warningCount})`);
        
        if (result.errors.length > 0) {
            result.errors.forEach(error => logger.error(`  - ${error}`));
        }
        
        if (result.warnings.length > 0) {
            result.warnings.forEach(warning => logger.warn(`  - ${warning}`));
        }
    }

    logger.info(`總計: ❌錯誤 ${totalErrors}, ⚠️警告 ${totalWarnings}`);
    
    if (totalErrors === 0) {
        logger.info('所有檢查都通過！');
    } else {
        logger.error('檢查發現問題，請修正後重試');
    }

    return {
        success: totalErrors === 0,
        results,
        totalErrors,
        totalWarnings
    };
}

// 如果直接執行此檔案
if (require.main === module) {
    const basePath = process.argv[2] || path.resolve(__dirname, '../../../');
    checkAssets(basePath)
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            logger.error('檢查過程發生錯誤:', error);
            process.exit(1);
        });
}

module.exports = {
    BaseChecker,
    SymbolSpinesChecker,
    checkAssets
};
