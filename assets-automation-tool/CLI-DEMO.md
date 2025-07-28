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
   1. download  - Download assets from Google Drive
   2. copytype  - Copy/sync downloaded assets to project  
   3. full      - Download + Copy (complete workflow)
Please select operation (1-3):
```

### 2. 選擇操作類型

#### 選項 1: Download 下載資源
輸入 `1` 後會看到：
```
📦 Select target for download:
   1. all       - Process all assets
   2. 2d        - Process 2D assets only
   3. 3d        - Process 3D assets only
   4. specific  - Specify a particular item
Please select target (1-4):
```

#### 選項 2: Copytype 複製同步
輸入 `2` 後會看到：
```
📦 Select target for copytype:
   1. all       - Process all assets
   2. 2d        - Process 2D assets only
   3. 3d        - Process 3D assets only  
   4. specific  - Specify a particular item
Please select target (1-4):
```

#### 選項 3: Full 完整流程
輸入 `3` 後會看到：
```
📦 Select target for full workflow:
   1. all       - Process all assets
   2. 2d        - Process 2D assets only
   3. 3d        - Process 3D assets only
   4. specific  - Specify a particular item
Please select target (1-4):
```

### 3. 選擇目標類型

#### 如果選擇 `4` (specific)，會顯示所有可用項目：
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
   Operation: download
   Target: font-bitmap

Confirm execution? (y/n):
```

### 5. 執行結果
根據選擇的操作類型，會執行相應的功能並顯示進度和結果。

## 🚀 支持的操作組合

1. **Download + All**: 下載所有資源
2. **Download + 2D**: 只下載 2D 資源 
3. **Download + 3D**: 只下載 3D 資源
4. **Download + Specific**: 下載指定單一項目
5. **Copytype + All**: 同步所有資源
6. **Copytype + 2D**: 同步 2D 資源
7. **Copytype + 3D**: 同步 3D 資源  
8. **Copytype + Specific**: 同步指定單一項目
9. **Full + Any Target**: 完整流程 (下載+同步)

## ✨ 特色功能

- 🎯 **直觀的分步引導**: 清晰的選項和說明
- 🔍 **智能項目選擇**: 支持編號或名稱輸入
- 📊 **詳細進度報告**: 實時顯示操作進度和統計
- ❌ **友好的錯誤處理**: 無效輸入會重新提示
- ✅ **操作確認**: 執行前會顯示摘要供確認 