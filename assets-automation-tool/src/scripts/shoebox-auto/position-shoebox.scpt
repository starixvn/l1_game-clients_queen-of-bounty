-- 從環境變數讀取配置
set fontBitmapDir to (do shell script "echo $CONFIG_FONT_BITMAP_DIR")
set exportDir to (do shell script "echo $CONFIG_EXPORT_DIR")
set shoeboxApp to (do shell script "echo $CONFIG_SHOEBOX_APP")
set finderOpenDelay to (do shell script "echo $CONFIG_FINDER_OPEN_DELAY")
set shoeboxOpenDelay to (do shell script "echo $CONFIG_SHOEBOX_OPEN_DELAY")

-- 開啟 Finder 目錄
do shell script "/usr/bin/open " & quoted form of fontBitmapDir

-- 建立 export-result 資料夾（如果不存在）
do shell script "mkdir -p " & quoted form of exportDir
log "✅ 確保 export-result 資料夾存在"

-- 等待 Finder 開啟
delay finderOpenDelay

-- 開啟 ShoeBox
do shell script "/usr/bin/open -a " & quoted form of shoeboxApp

-- 等待 ShoeBox 開啟
delay shoeboxOpenDelay

tell application "System Events"
  -- 智能設定 ShoeBox 視窗
  tell process "ShoeBox"
    set frontmost to true
    try
      -- 找到並移動 ShoeBox 主窗口（有"ShoeBox"名稱的窗口）
      set allWindows to every window
      repeat with w in allWindows
        try
          set windowName to name of w
          if windowName is "ShoeBox" then
            set position of w to {0, 23}
            set size of w to {500, 400}
            exit repeat
          end if
        end try
      end repeat
      -- 滑鼠點擊視窗
      do shell script "/opt/homebrew/bin/cliclick c:110,200"
      delay 0.5
    end try
  end tell
  
  -- 等待一下
  delay 1
  
  -- 設定 Finder 視窗
  tell process "Finder"
    set frontmost to true
    try
      -- 將 Finder 定位到 ShoeBox 下方
      set position of window 1 to {500, 450}
      set size of window 1 to {500, 500}
    end try
  end tell
  
  -- 等待視窗穩定
  delay 1
  
  -- 切換到圖像模式
  tell process "Finder"
    try
      -- 按 Command + 1 切換到圖像檢視
      key code 18 using command down
      delay 0.5
      
      -- 排列方式依照名稱排序 (檢視 -> 排列依據 -> 名稱)
      key code 5 using {command down, option down} -- Cmd+Option+5 或使用選單
      delay 0.3      
    end try
  end tell
  
  -- 等待排序完成
  delay 1
  
  -- 動態獲取要處理的字體文件名稱
  set targetFontFile to "font-multiplier.png"  -- 預設值
  try
    set targetFontFile to (do shell script "echo $TARGET_FONT_FILE")
    if targetFontFile is "" then
      set targetFontFile to "font-multiplier.png"
    end if
  on error
    set targetFontFile to "font-multiplier.png"
  end try
  
  log "🎯 目標字體文件: " & targetFontFile
  
  -- 根據字體文件名稱計算點擊位置
  set clickX to 670
  set clickY to 560
  
  if targetFontFile is "font-multiplier.png" then
    set clickX to 670
    set clickY to 560
  else if targetFontFile is "font-number.png" then
    set clickX to 780
    set clickY to 560
  else if targetFontFile is "font-win-money.png" then
    set clickX to 900
    set clickY to 560 
  end if
  
  log "📍 點擊位置: " & clickX & "," & clickY
  
  -- 點擊並拖曳指定的字體文件
  try
    -- 確保 Finder 窗口在前台
    tell process "Finder"
      set frontmost to true
    end tell
    delay 1
    
    -- 點擊確認文件位置
    do shell script "/opt/homebrew/bin/cliclick c:" & clickX & "," & clickY
    delay 0.5
    
    -- 開始拖拉：移動到起始位置並按住滑鼠
    do shell script "/opt/homebrew/bin/cliclick m:" & clickX & "," & clickY
    delay 0.5
    do shell script "/opt/homebrew/bin/cliclick dd:" & clickX & "," & clickY
    delay 1
    
    -- 確保 ShoeBox 窗口在前台
    tell process "ShoeBox"
      set frontmost to true
    end tell
    delay 0.5
    
    -- 慢速移動到目標位置 (分段移動)
    do shell script "/opt/homebrew/bin/cliclick dm:165,192"
    delay 0.5
    do shell script "/opt/homebrew/bin/cliclick dm:110,110"
    delay 0.8
    
    -- 結束拖拉 (放開滑鼠)
    do shell script "/opt/homebrew/bin/cliclick du:110,110"
    delay 2
    
    -- 智能設定 Bitmap Font 窗口位置
    delay 2
    try
      tell process "ShoeBox"
        set allWindows to every window
        set bitmapMoved to false
        
        -- 方法1: 尋找包含 "Bitmap" 或 "Font" 的窗口
        repeat with w in allWindows
          try
            set windowName to name of w
            if windowName contains "Bitmap" or windowName contains "Font" or windowName contains "BitMap" then
              set position of w to {520, 23}
              set size of w to {400, 300}
              set bitmapMoved to true
              exit repeat
            end if
          end try
        end repeat
        
        -- 方法2: 如果沒找到，尋找最大的空白窗口（通常是 Bitmap Font）
        if not bitmapMoved then
          set largestWindow to missing value
          set largestSize to 0
          
          repeat with w in allWindows
            try
              set windowName to name of w
              set windowSize to size of w
              set windowArea to (item 1 of windowSize) * (item 2 of windowSize)
              
              -- 空白名稱且面積最大的窗口
              if windowName is "" and windowArea > largestSize and windowArea > 50000 then
                set largestWindow to w
                set largestSize to windowArea
              end if
            end try
          end repeat
          
          if largestWindow is not missing value then
            set position of largestWindow to {520, 23}
            set size of largestWindow to {400, 300}
            set bitmapMoved to true
          end if
        end if
        
        -- 方法3: 如果還是沒找到，設定第一個非ShoeBox窗口
        if not bitmapMoved then
          repeat with w in allWindows
            try
              set windowName to name of w
              if windowName is not "ShoeBox" then
                set position of w to {520, 23}
                set size of w to {400, 300}
                exit repeat
              end if
            end try
          end repeat
        end if
      end tell
    end try
    
    delay 1
    

  end try
end tell