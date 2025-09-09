-- Replace Fonts Settings Script
-- 替換字體設定腳本

tell application "System Events"
  tell process "ShoeBox"
    set frontmost to true
    delay 0.5

    -- 動態獲取要處理的字體文件名稱和對應的配置
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
    
    -- 根據字體文件名稱決定配置文件和配置鍵
    set configKey to "font-multiplier"
    set sbxFile to "font-multiplier.sbx"
    
    if targetFontFile is "font-multiplier.png" then
      set configKey to "font-multiplier"
      set sbxFile to "font-multiplier.sbx"
    else if targetFontFile is "font-number.png" then
      set configKey to "font-number"
      set sbxFile to "font-number.sbx"
    else if targetFontFile is "font-win-money.png" then
      set configKey to "font-win-money"
      set sbxFile to "font-win-money.sbx"
    end if
    
    log "📁 使用配置: " & configKey & " (" & sbxFile & ")"
    
    -- 使用對應的 shoebox config 設定檔案
    do shell script "open -a 'Shoebox' /Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool/config/shoebox-config/" & sbxFile
    delay 1

    -- 點擊 Bitmap Font 窗口中的 Settings 按鈕
    try
        -- 找到 Bitmap Font 窗口（位置在 {520, 25} 附近的窗口）
        set bitmapWindow to missing value
        set allWindows to every window
        
        repeat with w in allWindows
          try
            set windowPos to position of w
            set windowSize to size of w
            set windowName to name of w
            set windowX to item 1 of windowPos
            set windowY to item 2 of windowPos
            set windowWidth to item 1 of windowSize
            set windowHeight to item 2 of windowSize
            
            -- 根據位置和大小識別 Bitmap Font 窗口
            -- 通常在 {520, 25} 位置，大小約 {416, 313}
            if windowX > 400 and windowX < 600 and windowY < 100 and windowWidth > 300 and windowHeight > 200 then
              set bitmapWindow to w
              set frontmost of w to true
              delay 0.5
              log "找到 Bitmap Font 窗口: 位置=" & windowX & "," & windowY & " 大小=" & windowWidth & "x" & windowHeight
              exit repeat
            end if
          end try
        end repeat
        
        -- 如果找到 Bitmap Font 窗口，動態計算 Settings 按鈕位置
        if bitmapWindow is not missing value then
          set windowPos to position of bitmapWindow
          set windowSize to size of bitmapWindow
          set windowX to item 1 of windowPos
          set windowY to item 2 of windowPos
          set windowWidth to item 1 of windowSize
          set windowHeight to item 2 of windowSize
          
          -- 根據字體文件動態設定 Settings 按鈕位置
          if targetFontFile is "font-number.png" then
            set settingsButtonX to 1000
            set settingsButtonY to 340
          else
            set settingsButtonX to 780
            set settingsButtonY to 320
          end if
          
          log "Bitmap Font 窗口位置: " & windowX & "," & windowY
          log "Settings 按鈕位置: " & settingsButtonX & "," & settingsButtonY
          
          delay 1
          do shell script "/opt/homebrew/bin/cliclick m:" & settingsButtonX & "," & settingsButtonY
          delay 0.3
          do shell script "/opt/homebrew/bin/cliclick c:" & settingsButtonX & "," & settingsButtonY
          delay 1
          
          log "✅ 已點擊 Settings 按鈕"
          
        else
          log "❌ 未找到 Bitmap Font 窗口"
        end if
        
        -- 等待 Bitmap Font Settings 窗口出現
        delay 2
        
        -- 檢查 Settings 窗口是否已出現並移動位置
        -- Settings 窗口通常比較高（height > 500)
        set allWindows to every window
        repeat with w in allWindows
          try
            set windowPos to position of w
            set windowSize to size of w
            set windowX to item 1 of windowPos
            set windowY to item 2 of windowPos
            set windowWidth to item 1 of windowSize
            set windowHeight to item 2 of windowSize
            
            -- 根據大小識別 Settings 窗口：高度 > 500
            if windowHeight > 500
              set position of w to {0, 250}  -- 移動到新位置
              set size of w to {350, 600}     -- 調整大小
              log "✅ Bitmap Font Settings 窗口已定位: " & windowWidth & "x" & windowHeight
              exit repeat
            end if
          end try
        end repeat
        
    on error errMsg
      log "❌ 點擊 Settings 按鈕失敗: " & errMsg
    end try
    
    -- 移動滑鼠到 Bitmap Font Settings 窗口內部準備下一步操作
    -- 點擊 Advanced 按鈕
    do shell script "/opt/homebrew/bin/cliclick m:150,297"
    delay 0.5
    do shell script "/opt/homebrew/bin/cliclick c:150,297"
    delay 1
    log "✅ 已點擊 Advanced 按鈕"

    -- 使用統一的字體配置文件
    set configFilePath to (do shell script "echo $CONFIG_FONTS_CONFIG_FILE")
    
    log "📄 配置文件路徑: " & configFilePath
    
    -- 讀取配置文件中的 File Format Loop 設定
    try
        set configContent to do shell script "cat " & quoted form of configFilePath
        -- 使用 jq 解析 JSON 並提取對應配置的 fileFormat.loop 值
        set fileFormatLoop to do shell script "echo " & quoted form of configContent & " | jq -r '.\"" & configKey & "\".fileFormat.loop'"
        log "✅ 成功讀取 File Format Loop 設定: " & fileFormatLoop
        
        -- 滑鼠移動到 File Format Loop 位置
        do shell script "/opt/homebrew/bin/cliclick m:230,427"
        delay 0.5
        
        -- 滑鼠點擊 File Format Loop 文字編輯視窗並選取所有文字
        do shell script "/opt/homebrew/bin/cliclick c:230,427"
        delay 0.5
        
        -- 選取全部文字 (Cmd+A) 然後刪除
        key code 0 using command down  -- Cmd+A
        delay 0.3
        key code 51  -- Delete key
        delay 0.5
        
        -- 輸入新的 File Format Loop 文字
        set the clipboard to fileFormatLoop
        delay 0.3
        key code 9 using command down  -- Cmd+V
        delay 0.5
        
        log "✅ 已成功更新 File Format Loop 設定"
        
        -- 滑鼠移動到 File Format Outer 位置 230,462
        do shell script "/opt/homebrew/bin/cliclick m:230,462"
        delay 0.5
        -- 使用 jq 解析 JSON 並提取對應配置的 fileFormat.outer 值
        set fileFormatOuter to do shell script "echo " & quoted form of configContent & " | jq -r '.\"" & configKey & "\".fileFormat.outer'"
        log "✅ 成功讀取 File Format Outer 設定: " & fileFormatOuter

        -- 滑鼠移動到 File Format Outer 位置 230,462
        do shell script "/opt/homebrew/bin/cliclick m:230,462"
        delay 0.5

        -- 滑鼠點擊 File Format Outer 文字編輯視窗並選取所有文字
        do shell script "/opt/homebrew/bin/cliclick c:230,462"
        delay 0.5
        -- 選取全部文字 (Cmd+A) 然後刪除
        key code 0 using command down  -- Cmd+A
        delay 0.3
        key code 51  -- Delete key
        delay 0.5

        -- 輸入新的 File Format Outer 文字
        -- 先讀取 image-heights.json 找到對應字體的 height 值
        set imageHeightsPath to (do shell script "echo $CONFIG_IMAGE_HEIGHTS_FILE")
        set imageHeightsContent to do shell script "cat " & quoted form of imageHeightsPath
        
        -- 使用 jq 找到目標字體文件的 height 值
        set fontHeight to do shell script "echo " & quoted form of imageHeightsContent & " | jq -r '.heights[] | select(.file == \"" & targetFontFile & "\") | .height'"
        log "✅ 從 image-heights.json 讀取到 " & targetFontFile & " height: " & fontHeight
        
        -- 取得原始的 fileFormat.outer 模板
        set fileFormatOuterTemplate to do shell script "echo " & quoted form of configContent & " | jq -r '.\"" & configKey & "\".fileFormat.outer'"
        
        -- 使用 sed 將模板中的 "變數" 替換為實際的 height 值
        set fileFormatOuter to do shell script "echo " & quoted form of fileFormatOuterTemplate & " | sed 's/變數/" & fontHeight & "/g'"
        log "✅ 成功處理 File Format Outer 設定: " & fileFormatOuter
        
        -- 將處理好的 fileFormatOuter 內容設定到剪貼簿並貼上
        set the clipboard to fileFormatOuter
        delay 0.3
        key code 9 using command down  -- Cmd+V
        delay 0.5
        
        log "✅ 已成功更新 File Format Outer 設定"

        -- 使用 sed 將  195,772 txt Line Height 改為 fontHeight
        do shell script "/opt/homebrew/bin/cliclick m:195,772"
        delay 0.5
        do shell script "/opt/homebrew/bin/cliclick c:195,772"
        delay 0.5
        -- 選取全部文字 (Cmd+A) 然後刪除
        key code 0 using command down  -- Cmd+A
        delay 0.3
        key code 51  -- Delete key
        delay 0.5
        set the clipboard to fontHeight
        delay 0.3
        key code 9 using command down  -- Cmd+V
        delay 0.5
        log "✅ 已成功更新 txt Line Height 設定"


        -- 點擊 Apply 按鈕
        do shell script "/opt/homebrew/bin/cliclick m:330,872"
        delay 0.5
        do shell script "/opt/homebrew/bin/cliclick c:330,872"
        delay 0.5
        -- 點擊 Apply X 關閉按鈕
        do shell script "/opt/homebrew/bin/cliclick m:360,270"
        delay 0.5
        do shell script "/opt/homebrew/bin/cliclick c:360,270"
        delay 0.5
        
        -- 根據字體文件動態設定 Save 按鈕位置
        if targetFontFile is "font-number.png" then
          set saveButtonX to 1100
          set saveButtonY to 340
        else
          set saveButtonX to 880
          set saveButtonY to 318
        end if
        
        -- 點擊 Save 按鈕
        do shell script "/opt/homebrew/bin/cliclick m:" & saveButtonX & "," & saveButtonY
        delay 0.5
        do shell script "/opt/homebrew/bin/cliclick c:" & saveButtonX & "," & saveButtonY
        delay 1
        log "✅ 已點擊 Apply + Save 按鈕"
        
        -- 等待檔案產出
        delay 3
        
        -- 移動產出檔案到 export-result 資料夾
        try
          set exportDir to "/Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool/output/downloads/font-bitmap/export-result"
          
          -- 根據字體文件名稱決定產出檔案名稱
          set baseName to ""
          if targetFontFile is "font-multiplier.png" then
            set baseName to "font-multiplier"
          else if targetFontFile is "font-number.png" then
            set baseName to "font-number"
          else if targetFontFile is "font-win-money.png" then
            set baseName to "font-win-money"
          end if
          
          if baseName is not "" then
            set sourceDir to "/Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool/output/downloads/font-bitmap"
            set fntFile to baseName & "-export.fnt"
            set pngFile to baseName & "-export.png"
            
            -- 移動 .fnt 檔案
            set fntSource to quoted form of (sourceDir & "/" & fntFile)
            set fntTarget to quoted form of (exportDir & "/" & fntFile)
            do shell script "if [ -f " & fntSource & " ]; then mv " & fntSource & " " & fntTarget & "; echo 'Moved " & fntFile & "'; else echo 'File " & fntFile & " not found'; fi"
            
            -- 移動 .png 檔案
            set pngSource to quoted form of (sourceDir & "/" & pngFile)
            set pngTarget to quoted form of (exportDir & "/" & pngFile)
            do shell script "if [ -f " & pngSource & " ]; then mv " & pngSource & " " & pngTarget & "; echo 'Moved " & pngFile & "'; else echo 'File " & pngFile & " not found'; fi"
            
            log "✅ 已嘗試移動產出檔案到 export-result 資料夾: " & fntFile & ", " & pngFile
          end if
          
        on error exportErr
          log "❌ 移動檔案失敗: " & exportErr
        end try

    on error errMsg
        log "❌ 讀取或設定 File Format 失敗: " & errMsg
    end try
  end tell
end tell
