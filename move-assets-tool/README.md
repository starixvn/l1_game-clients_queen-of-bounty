# Move Assets Tool

文件同步工具 - 將指定資料夾內容同步到 Cocos Creator 專案

## 功能特色

- 📁 自動同步多個資料夾
- 🎯 支援 2D/3D 資源分類同步
- 🔧 可配置的過濾規則
- 🗑️ 自動清理 .meta 文件
- 📊 詳細的操作報告
- 🎮 **全新！交互式 CLI 界面**

## 系統需求

- Node.js >= 18.20.6

## 使用方法

### 🎮 交互式 CLI（推薦）
```bash
# 啟動交互式 CLI
npm run cli

# 或直接執行
node move-assets-cli.js
```

交互式 CLI 會引導你：
1. ✅ 確認路徑配置（來源資料夾和專案根目錄）
2. 🔧 如有需要可修正路徑
3. 🎯 選擇同步選項（2D/3D/全部/指定資料夾）
4. 🚀 執行同步操作

### 傳統命令行方式
```bash
# 同步所有資料夾
npm run sync

# 只同步 2D 資源
npm run sync:2d

# 只同步 3D 資源  
npm run sync:3d

# 指定單個資料夾
node move-assets.js --folder textures

# 查看幫助
npm run help
```

## 配置說明

### config.json（必需）
全局配置文件，如果不存在會自動創建：
```json
{
    "sourceFolder": "/your/source/folder/path",
    "projectRoot": "/your/project/root/path",
    "mappingFile": "folder-mapping.json",
    "excludePatterns": [".DS_Store", "*.tmp", ".git", "node_modules"]
}
```

**注意：** 
- 第一次使用時，如果沒有 `config.json`，CLI 工具會自動創建空配置
- 系統會引導你設定 `sourceFolder` 和 `projectRoot` 路徑
- 不再有硬編碼的預設路徑，確保工具適用於所有用戶

### folder-mapping.json
資源映射配置：
```json
{
  "categories": {
    "2D": {
      "texture-packer": "graphics/images",
      "replace-assets/resources/i18n/images": "src/assets/resources/i18n-images"
    },
    "3D": {
      "mascot": "src/assets/resources/spines/mascot",
      "symbol-spines": "src/assets/resources/symbol-spines"
    }
  }
}
```

- **key**: 來源資料夾路徑 (相對於 sourceFolder)
- **value**: 目標路徑 (相對於 projectRoot)

## 安裝為全局命令（可選）
```bash
# 在工具目錄下執行
npm link

# 現在可以在任何地方使用
move-assets-cli
```

## 輸出範例

```
🎮 歡迎使用 Move Assets CLI 工具！

✅ 成功加載配置文件
📁 當前路徑配置：
   來源資料夾: /Users/jaysonCheng/Downloads/Test
   專案根目錄: /Users/jaysonCheng/pentagon/lucky-neko

路徑是否正確？ (y/n): y

🔄 選擇同步選項：
   1. all  - 同步所有資料夾
   2. 2D   - 只同步 2D 資源
   3. 3D   - 只同步 3D 資源
   4. folder - 指定特定資料夾

請選擇 (1-4 或直接輸入類型名稱): 2

🚀 開始同步：2D
確認執行？ (y/n): y

📂 texture-packer -> graphics/images
✅ 複製文件 -> /source/texture.png -> /dest/texture.png
🗑️ 刪除 .meta -> /dest/texture.png.meta

================================================================================
📊 操作結果
================================================================================
+------+----------+------------------+------------------+
| 狀態 | 操作     | 來源             | 目標             |
+------+----------+------------------+------------------+
| 📁   | 建立資料夾|                  | /path/to/dest    |
| ✅   | 複製文件  | /source/file.png | /dest/file.png   |
| 🗑️   | 刪除 .meta|                  | /dest/file.meta  |
+------+----------+------------------+------------------+
================================================================================

✅ 完成！共 3 個操作
```

## 注意事項

1. 確保來源資料夾存在且有讀取權限
2. 確保目標專案路徑正確且有寫入權限  
3. 同步前建議備份重要文件
4. 工具會自動刪除目標位置的 .meta 文件
5. 交互式 CLI 會在執行前進行路徑驗證

## 故障排除

### 常見問題

**Q: 提示找不到 folder-mapping.json**
A: 確保配置文件在工具根目錄下

**Q: 同步失敗**
A: 檢查路徑權限和磁碟空間

**Q: 找不到來源資料夾**
A: 使用交互式 CLI 重新設定路徑

**Q: CLI 無法啟動**
A: 確保 Node.js 版本 >= 18.20.6，檢查 config.json 格式是否正確 