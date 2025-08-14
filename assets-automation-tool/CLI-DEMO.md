# Assets Automation CLI Tool 演示

## 🎮 啟動 CLI 工具
```bash
npm run cli
```

## 📋 功能演示流程

### 1. 歡迎界面
```
🎮 Welcome to Assets Automation CLI Tool!
✅ Configuration loaded successfully

🚀 Select operation type:
   1. full      - Download + Copy (complete workflow)
   2. download  - Download assets from Google Drive
   3. copy      - Copy/sync downloaded assets to project
Please select operation (1-3):
```

### 2. 選擇操作類型

#### 選項 1: Full 完整流程 (推薦) 🌟
輸入 `1` 後會看到：
```
📦 Select target for full:
   1. specific  - Specify a particular item
   2. all       - Process all assets
   3. 2d        - Process 2D assets only
   4. 3d        - Process 3D assets only
Please select target (1-4):
```

#### 選項 2: Download 下載資源
輸入 `2` 後會看到：
```
📦 Select target for download:
   1. specific  - Specify a particular item
   2. all       - Process all assets
   3. 2d        - Process 2D assets only
   4. 3d        - Process 3D assets only
Please select target (1-4):
```

#### 選項 3: Copy 複製同步
輸入 `3` 後會看到：
```
📦 Select target for copy:
   1. specific  - Specify a particular item
   2. all       - Process all assets
   3. 2d        - Process 2D assets only  
   4. 3d        - Process 3D assets only
Please select target (1-4):
```

### 3. 選擇目標類型

#### 如果選擇 `1` (specific)，會顯示所有可用項目：
```
📋 Available items:
   1. font-bitmap - Font bitmap files
   2. big-images - Large texture images
   3. i18n-images - Internationalization images
   4. texture-packer - Texture packer resources
   5. mascot - Mascot spine animations
   6. symbol-spines - Symbol spine animations
   7. btn-spin - Spin button spine animation
   8. decor - Decoration spine animations
   9. transition - Transition spine animations
   10. effect - Effect spine animations
   11. icon-game - Game icons
Enter item name or number:
```

### 4. 確認執行
```
📋 Summary:
   Operation: full
   Target: font-bitmap

Confirm execution? (y/n):
```

### 5. 執行結果
根據選擇的操作類型，會執行相應的功能並顯示進度和結果。

## 🚀 使用教學

### 快速開始 (推薦流程)

1. **啟動工具**
   ```bash
   npm run cli
   ```

2. **選擇 Full 完整流程** (推薦新手使用)
   - 輸入 `1` 選擇 full workflow
   - 這會自動執行下載 + 複製的完整流程

3. **選擇目標範圍**
   - 輸入 `2` 選擇 all (處理所有資源) - 最常用
   - 或選擇其他選項根據需求

4. **確認執行**
   - 輸入 `y` 確認執行

### 進階使用場景

#### 🎯 場景 1: 只需要特定資源
```
選擇: 1 (full) → 1 (specific) → 輸入項目名稱或編號
適用: 只需要更新某個特定資源時
```

#### 🎯 場景 2: 只需要下載，稍後手動處理
```
選擇: 2 (download) → 2 (all)
適用: 先批量下載，之後再決定如何處理
```

#### 🎯 場景 3: 資源已下載，只需同步
```
選擇: 3 (copy) → 2 (all)
適用: 已有下載的資源，只需要同步到項目中
```

#### 🎯 場景 4: 只處理 2D 或 3D 資源
```
選擇: 1 (full) → 3 (2d) 或 4 (3d)
適用: 項目只需要特定類型的資源
```

## 🚀 支持的操作組合

### 主要操作流程
1. **Full + All**: 完整流程處理所有資源 ⭐ (最常用)
2. **Full + Specific**: 完整流程處理指定項目 ⭐ (精確控制)
3. **Full + 2D**: 完整流程處理 2D 資源
4. **Full + 3D**: 完整流程處理 3D 資源

### 分步操作流程
5. **Download + All**: 下載所有資源
6. **Download + Specific**: 下載指定單一項目
7. **Download + 2D**: 只下載 2D 資源 
8. **Download + 3D**: 只下載 3D 資源
9. **Copy + All**: 同步所有資源
10. **Copy + Specific**: 同步指定單一項目
11. **Copy + 2D**: 同步 2D 資源  
12. **Copy + 3D**: 同步 3D 資源

## 💡 使用技巧

### 輸入方式
- **數字輸入**: 直接輸入選項編號 (如: `1`, `2`, `3`)
- **文字輸入**: 直接輸入操作名稱 (如: `full`, `download`, `copy`)
- **項目選擇**: 可以輸入項目編號或完整項目名稱

### 建議使用順序
1. **新手用戶**: 使用 `1 (full) → 2 (all)` - 最簡單直接
2. **測試特定功能**: 使用 `1 (full) → 1 (specific)` - 精確測試
3. **分步調試**: 先用 `2 (download)` 下載，再用 `3 (copy)` 同步

## ✨ 特色功能

- 🎯 **完整流程優先**: Full workflow 放在第一位，方便快速使用
- 🔍 **智能項目選擇**: 支持編號或名稱輸入
- 📊 **詳細進度報告**: 實時顯示操作進度和統計
- ❌ **友好的錯誤處理**: 無效輸入會重新提示
- ✅ **操作確認**: 執行前會顯示摘要供確認
- 🚀 **靈活的目標選擇**: specific 選項放在最前面，方便精確控制 


## 常見問題
- 無法下載資源 
1. 檢查 drive 資料夾沒有加入  drive-downloader 機器人
2. 確認 config.json 資料夾id 是否正確
