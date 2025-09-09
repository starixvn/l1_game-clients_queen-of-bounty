#!/usr/bin/env node
/**
 * 文件同步工具 - 將指定資料夾內容同步到 Cocos Creator 專案
 * folder-mapping.json → 讀取 "symbol-spines": "src/assets/resources/symbol-spines"
 *                    ↓
 * 檢查 source_folder/symbol-spines 是否存在
 *                    ↓
 * 如果存在 → 複製所有文件到目標位置
 *                    ↓
 * 複製文件時 → 自動清理同名 .meta 文件
 *                    ↓
 * 如果不存在 → 記錄警告並跳過
 *                    ↓
 * 最後顯示操作結果
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 將回調函數轉換為 Promise
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

class FileSynchronizer {
    constructor() {
        this.sourceFolder = "/Users/jaysonCheng/Downloads/Test";
        this.projectRoot = "/Users/jaysonCheng/pentagon/queen-of-bounty";
        this.operationLog = [];
        this.folderMapping = null;
    }

    async loadMapping() {
        try {
            const data = await readFile("folder-mapping.json", 'utf8');
            this.folderMapping = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log("❌ 找不到 folder-mapping.json");
                process.exit(1);
            }
            throw error;
        }
    }

    log(status, operation, source = "", destination = "") {
        this.operationLog.push([status, operation, source, destination]);
    }

    async syncFolder(sourcePath, destinationPath) {
        try {
            const sourceStats = await stat(sourcePath);
            
            if (!sourceStats.isDirectory()) {
                this.log("⚠️", "來源不是資料夾", sourcePath);
                return;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.log("⚠️", "來源不存在", sourcePath);
                return;
            }
            throw error;
        }

        // 確保目標資料夾存在
        try {
            await mkdir(destinationPath, { recursive: true });
            this.log("📁", "建立資料夾", "", destinationPath);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }

        // 讀取來源資料夾內容
        const items = await readdir(sourcePath);
        
        for (const item of items) {
            const sourceItem = path.join(sourcePath, item);
            const destItem = path.join(destinationPath, item);
            
            try {
                const itemStats = await stat(sourceItem);
                
                if (itemStats.isDirectory()) {
                    await this.syncFolder(sourceItem, destItem);
                } else {
                    await copyFile(sourceItem, destItem);
                    this.log("✅", "複製文件", sourceItem, destItem);
                    
                    // 清理 meta 文件
                    const metaFile = destItem + ".meta";
                    try {
                        await unlink(metaFile);
                        this.log("🗑️", "刪除 .meta", "", metaFile);
                    } catch (error) {
                        if (error.code !== 'ENOENT') {
                            // 如果不是文件不存在的錯誤，則拋出
                            throw error;
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ 處理文件時出錯: ${sourceItem}`, error.message);
            }
        }
    }

    printTable(data, headers) {
        if (!data || data.length === 0) {
            return;
        }

        // 計算列寬
        const widths = headers.map(h => h.length + 2);
        for (const row of data) {
            for (let i = 0; i < row.length && i < widths.length; i++) {
                widths[i] = Math.max(widths[i], String(row[i]).length + 2);
            }
        }

        const border = () => {
            console.log("+" + widths.map(w => "-".repeat(w)).join("+") + "+");
        };

        border();
        console.log("|" + headers.map((h, i) => ` ${h.padEnd(widths[i] - 1)}`).join("|") + "|");
        border();

        for (const row of data) {
            let line = "|";
            for (let i = 0; i < row.length && i < widths.length; i++) {
                line += ` ${String(row[i]).padEnd(widths[i] - 1)}|`;
            }
            console.log(line);
        }
        border();
    }

    async run() {
        console.log("🚀 開始同步...");
        
        await this.loadMapping();

        for (const [key, destPath] of Object.entries(this.folderMapping)) {
            const sourcePath = path.join(this.sourceFolder, key);
            const fullDestPath = path.join(this.projectRoot, destPath);
            console.log(`\n📂 ${key} -> ${destPath}`);
            await this.syncFolder(sourcePath, fullDestPath);
        }

        if (this.operationLog.length > 0) {
            console.log("\n" + "=".repeat(80));
            console.log("📊 操作結果");
            console.log("=".repeat(80));
            this.printTable(this.operationLog, ["狀態", "操作", "來源", "目標"]);
            console.log("=".repeat(80));
        }

        console.log(`\n✅ 完成！共 ${this.operationLog.length} 個操作`);
    }
}

// 主程序
async function main() {
    try {
        const synchronizer = new FileSynchronizer();
        await synchronizer.run();
    } catch (error) {
        if (error.code === 'SIGINT') {
            console.log("\n⚠️ 已中斷");
        } else {
            console.log(`\n❌ 錯誤: ${error.message}`);
            process.exit(1);
        }
    }
}

// 處理 Ctrl+C 中斷
process.on('SIGINT', () => {
    console.log("\n⚠️ 已中斷");
    process.exit(0);
});

// 執行主程序
if (require.main === module) {
    main();
}

module.exports = FileSynchronizer; 