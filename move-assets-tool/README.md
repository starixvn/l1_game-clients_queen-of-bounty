# 文件同步工具 (Node.js 版本)

將指定資料夾內容同步到 Cocos Creator 專案的工具。

## 功能

- 根據 `folder-mapping.json` 配置同步文件
- 自動建立目標資料夾
- 複製文件時自動清理同名 `.meta` 文件
- 顯示詳細的操作結果表格
- 支援中斷處理 (Ctrl+C)

## 系統需求

- Node.js >= 18.20.6

## 使用方法

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置路徑

編輯 `move-assets.js` 文件中的路徑配置：

```javascript
this.sourceFolder = "/Users/jaysonCheng/Downloads/Test";  // 來源資料夾
this.projectRoot = "/Users/jaysonCheng/pentagon/big-bass-fishing";  // 專案根目錄
```

### 3. 配置映射

編輯 `folder-mapping.json` 文件：

```json
{
    "symbol-spines": "src/assets/resources/symbol-spines",
    "decor": "src/assets/resources/spines/decor",
    "effect": "src/assets/resources/spines/effects"
}
```

### 4. 執行同步

```bash
# 方法 1: 使用 npm script
npm start
# 或
npm run sync

# 方法 2: 直接執行
node move-assets.js
```

## 配置說明

### folder-mapping.json

- **key**: 來源資料夾名稱 (相對於 sourceFolder)
- **value**: 目標路徑 (相對於 projectRoot)

### 範例

如果 `sourceFolder` 是 `/Users/jaysonCheng/Downloads/Test`，配置為：

```json
{
    "symbol-spines": "src/assets/resources/symbol-spines"
}
```

則會將 `/Users/jaysonCheng/Downloads/Test/symbol-spines` 的內容同步到：
`/Users/jaysonCheng/pentagon/big-bass-fishing/src/assets/resources/symbol-spines`

## 輸出範例

```
🚀 開始同步...

📂 symbol-spines -> src/assets/resources/symbol-spines
📁 建立資料夾 -> /path/to/destination
✅ 複製文件 -> /source/file.json -> /destination/file.json
🗑️ 刪除 .meta -> /destination/file.json.meta

================================================================================
📊 操作結果
================================================================================
+------+----------+------------------+------------------+
| 狀態 | 操作     | 來源             | 目標             |
+------+----------+------------------+------------------+
| 📁   | 建立資料夾|                  | /path/to/dest    |
| ✅   | 複製文件  | /source/file.json| /dest/file.json  |
| 🗑️   | 刪除 .meta|                  | /dest/file.meta  |
+------+----------+------------------+------------------+
================================================================================

✅ 完成！共 3 個操作
```

## 注意事項

1. 確保有足夠的權限讀取來源資料夾和寫入目標資料夾
2. 同步過程中會自動刪除目標位置的同名 `.meta` 文件
3. 如果來源資料夾不存在，會記錄警告並跳過
4. 支援 Ctrl+C 中斷操作 