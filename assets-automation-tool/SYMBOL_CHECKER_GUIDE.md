# 資源檢查工具 (Assets Checker)

### 需求
```
我需要一個可擴充性的功能，可以檢查資源是否存在，以及檢查資源是否正確
但是每個資料夾的檢查方式不同，所以需要一個可擴充性的功能
1. 檢查資源是否存在
2. 第一個是 src/assets/resources/symbol-spines 資料夾
3. symbol-spines 資料夾 裡面有symbol-0.json ~ symbol-10.json 共13個檔案
4. 檢查 symbol-0.json ~ symbol-9.json 裡面 animations 的 "explode", "highlight", "idle" 三個動畫是否存在，不可以拼錯字
5. 檢查 symbol-10.json ~ symbol-13.json 裡面 animations 的 "highlight", "idle" 二個動畫是否存在，不可以拼錯字
6. symbol.atlas 是否有 symbol.webp 這個字串，以及該資料夾是否有 symbol.webp 這個檔案
```

這是一個可擴充的資源檢查系統，用於驗證專案中的資源檔案是否正確。

## 使用方法

### 執行檢查

```bash
# 在 assets-automation-tool 目錄下執行
npm run symbol-checker-cli

# 或直接執行
node src/scripts/symbol-checker-cli.js

# 指定特定路徑
node src/scripts/symbol-checker-cli.js /path/to/project
```

### 目前支援的檢查

#### Symbol Spines 檢查器
檢查 `src/assets/resources/symbol-spines` 資料夾：

1. **檔案存在性檢查:**
   - `symbol-0.json` 到 `symbol-13.json` (共14個檔案)
   - `symbol.atlas`
   - `symbol.webp`

2. **動畫檢查:**
   - `symbol-0.json` ~ `symbol-9.json`: 必須包含 `explode`, `highlight`, `idle` 動畫
   - `symbol-10.json` ~ `symbol-13.json`: 必須包含 `highlight`, `idle` 動畫

3. **Atlas 檢查:**
   - `symbol.atlas` 檔案必須包含 `symbol.webp` 字串

## 如何擴充新的檢查器

### 1. 創建新的檢查器類別

```javascript
class YourCustomChecker extends BaseChecker {
    constructor(basePath) {
        super('Your Checker Name', basePath);
        this.targetPath = path.join(basePath, 'your/target/path');
    }

    async check() {
        logger.info(`開始檢查 Your Resource...`);
        
        // 實作你的檢查邏輯
        if (!this.fileExists(this.targetPath)) {
            this.addError(`目標資料夾不存在: ${this.targetPath}`);
            return;
        }

        // 添加更多檢查邏輯...
        
        logger.info(`Your Resource 檢查完成`);
    }
}
```

### 2. 註冊檢查器

在 `checkAssets` 函數中的 `checkers` 陣列添加你的檢查器：

```javascript
const checkers = [
    new SymbolSpinesChecker(basePath),
    new YourCustomChecker(basePath)  // 添加這行
];
```

### 3. 可用的基礎方法

`BaseChecker` 提供以下實用方法：

- `fileExists(filePath)` - 檢查檔案是否存在
- `readJsonFile(filePath)` - 讀取JSON檔案
- `readTextFile(filePath)` - 讀取文字檔案
- `addError(message)` - 添加錯誤
- `addWarning(message)` - 添加警告

## 範例輸出

```
ℹ️ 開始資源檢查...
ℹ️ 開始檢查 Symbol Spines 資源...
ℹ️ Symbol Spines 檢查完成
ℹ️ ==================================================
ℹ️ 資源檢查總結:
ℹ️ Symbol Spines: ✓ 通過 (錯誤: 0, 警告: 0)
ℹ️ 總計: 錯誤 0, 警告 0
ℹ️ 所有檢查都通過！
```

如果有問題會顯示：

```
❌ [Symbol Spines] 檔案不存在: symbol-0.json
❌ [Symbol Spines] symbol-1.json 缺少動畫: explode
⚠️ [Symbol Spines] symbol-2.json 包含額外的動畫: custom_animation
```

## 擴充性特點

- **模組化設計**: 每個檢查器都是獨立的類別
- **錯誤處理**: 自動捕捉和報告錯誤
- **詳細日志**: 完整的檢查過程記錄
- **彈性配置**: 容易添加新的檢查規則
- **批次執行**: 一次執行多個檢查器

## 開發建議

1. 每個檢查器專注於單一資源類型
2. 使用描述性的錯誤訊息
3. 適當使用警告而非錯誤
4. 添加適當的日志記錄
5. 考慮檢查的性能影響