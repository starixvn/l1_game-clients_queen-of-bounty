#!/bin/bash

# ShoeBox 自動化腳本執行器 (支持 Ctrl+C 中斷)
# 使用方式: 
#   ./run-with-interrupt.sh                                    # 處理 font-multiplier.png (預設)
#   ./run-with-interrupt.sh font-multiplier.png               # 處理單一檔案
#   ./run-with-interrupt.sh font-number.png font-win-money.png # 處理多個檔案
#   ./run-with-interrupt.sh all                               # 依序處理所有檔案

# 載入配置助手
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config-helper.sh"

# 驗證配置並匯出環境變數
if ! validate_config; then
    echo "❌ 配置驗證失敗，請檢查 main-config.json"
    exit 1
fi

export_config_to_env

# 從配置文件讀取支援的字體文件（config-helper.sh 已檢查文件存在）
MAIN_CONFIG_FILE="$SCRIPT_DIR/../../../config/shoebox-config/main-config.json"
ALL_FONTS=()
while IFS= read -r font; do
    ALL_FONTS+=("$font")
done < <(jq -r '.supported_fonts[]' "$MAIN_CONFIG_FILE")

# 驗證單一字體文件
validate_font() {
    local font="$1"
    for supported_font in "${ALL_FONTS[@]}"; do
        if [ "$font" = "$supported_font" ]; then
            return 0
        fi
    done
    return 1
}

# 處理命令行參數
if [ $# -eq 0 ]; then
    # 沒有參數，使用預設
    FONT_FILES=("font-multiplier.png")
elif [ "$1" = "all" ]; then
    # 處理所有檔案
    FONT_FILES=("${ALL_FONTS[@]}")
    echo "🎯 將依序處理所有字體文件: ${ALL_FONTS[*]}"
else
    # 處理指定的檔案
    FONT_FILES=("$@")
    
    # 驗證所有指定的檔案
    for font in "${FONT_FILES[@]}"; do
        if ! validate_font "$font"; then
            echo "❌ 錯誤: 不支援的字體文件 '$font'"
            echo "💡 支援的字體文件: ${ALL_FONTS[*]}"
            echo "💡 或使用 'all' 處理所有檔案"
            exit 1
        fi
    done
    
    echo "🎯 目標字體文件: ${FONT_FILES[*]}"
fi

echo "🚀 開始執行 ShoeBox 自動化流程..."
echo "💡 按 Ctrl+C 可以隨時中斷腳本"
echo ""

# 設定中斷信號處理
cleanup() {
    echo ""
    echo "❌ 檢測到中斷信號 (Ctrl+C)"
    echo "🛑 正在停止所有腳本執行..."
    
    # 殺死所有相關進程
    pkill -f "osascript.*position-shoebox"
    pkill -f "osascript.*replace-fonts-settings"
    pkill -f "cliclick"
    
    echo "✅ 所有腳本已安全停止"
    exit 1
}

# 註冊信號處理器
trap cleanup SIGINT SIGTERM

# 處理單一字體文件的函數
process_font() {
    local font_file="$1"
    local current_index="$2"
    local total_count="$3"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 處理進度: [$current_index/$total_count] $font_file"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 匯出環境變數供 AppleScript 使用
    export TARGET_FONT_FILE="$font_file"
    
    # 執行第一個 AppleScript
    echo "▶️ 步驟 1: 正在執行 position-shoebox.scpt..."
    osascript position-shoebox.scpt &
    
    # 獲取背景進程 PID
    SCRIPT_PID=$!
    
    # 等待腳本完成
    wait $SCRIPT_PID
    
    # 檢查執行結果
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 步驟 1 完成: position-shoebox.scpt 執行成功！"
        echo ""
        
        # 執行第二個 AppleScript
        echo "▶️ 步驟 2: 正在執行 replace-fonts-settings.scpt..."
        osascript replace-fonts-settings.scpt &
        
        # 獲取第二個腳本的 PID
        SCRIPT_PID2=$!
        
        # 等待第二個腳本完成
        wait $SCRIPT_PID2
        
        # 檢查第二個腳本的執行結果
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 [$current_index/$total_count] $font_file 處理完成！"
            return 0
        else
            echo ""
            echo "❌ [$current_index/$total_count] $font_file 步驟 2 失敗: replace-fonts-settings.scpt 執行錯誤"
            return 1
        fi
    else
        echo ""
        echo "❌ [$current_index/$total_count] $font_file 步驟 1 失敗: position-shoebox.scpt 執行錯誤"
        echo "⏹️ 跳過步驟 2"
        return 1
    fi
}

# 主要執行邏輯：循環處理所有指定的檔案
TOTAL_FILES=${#FONT_FILES[@]}
PROCESSED_COUNT=0
FAILED_COUNT=0

for i in "${!FONT_FILES[@]}"; do
    CURRENT_INDEX=$((i + 1))
    FONT_FILE="${FONT_FILES[$i]}"
    
    if process_font "$FONT_FILE" "$CURRENT_INDEX" "$TOTAL_FILES"; then
        PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
        SUCCESS_FLAG=true
    else
        FAILED_COUNT=$((FAILED_COUNT + 1))
        SUCCESS_FLAG=false
    fi
    
    # 如果不是最後一個檔案，決定如何繼續
    if [ $CURRENT_INDEX -lt $TOTAL_FILES ]; then
        echo ""
        if [ "$SUCCESS_FLAG" = true ]; then
            echo "⏸️ 即將處理下一個檔案..."
            echo "💡 $CONFIG_AUTO_CONTINUE_DELAY 秒後自動繼續，或按 Ctrl+C 退出"
            sleep "$CONFIG_AUTO_CONTINUE_DELAY"
        else
            echo "⏸️ 處理失敗，即將處理下一個檔案..."
            echo "💡 按 Enter 繼續，或 Ctrl+C 退出"
            read -r
        fi
    fi
done

# 顯示最終結果
echo ""
echo "🏁 所有檔案處理完成！"
echo "📊 處理統計："
echo "   ✅ 成功: $PROCESSED_COUNT 個檔案"
echo "   ❌ 失敗: $FAILED_COUNT 個檔案"
echo "   📋 總計: $TOTAL_FILES 個檔案"
