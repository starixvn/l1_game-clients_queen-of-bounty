#!/bin/bash

# 配置助手腳本 - 用於讀取主配置文件
# 使用方式: source config-helper.sh

# 獲取腳本所在目錄的絕對路徑
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MAIN_CONFIG_FILE="$PROJECT_ROOT/config/shoebox-config/main-config.json"

# 檢查配置文件是否存在
if [ ! -f "$MAIN_CONFIG_FILE" ]; then
    echo "❌ 錯誤: 找不到主配置文件 $MAIN_CONFIG_FILE"
    exit 1
fi

# 讀取配置的函數
get_config() {
    local key="$1"
    jq -r "$key" "$MAIN_CONFIG_FILE" 2>/dev/null || echo ""
}

# 讀取路徑配置
get_path() {
    local path_key="$1"
    get_config ".paths.$path_key"
}

# 讀取目錄配置
get_directory() {
    local dir_key="$1"
    local project_root=$(get_path "project_root")
    local relative_path=$(get_config ".directories.$dir_key")
    echo "$project_root/$relative_path"
}

# 讀取延遲配置
get_delay() {
    local delay_key="$1"
    get_config ".delays.$delay_key"
}

# 匯出環境變數供 AppleScript 使用
export_config_to_env() {
    # 基本路徑
    export CONFIG_SHOEBOX_APP=$(get_path "shoebox_app")
    export CONFIG_CLICLICK=$(get_path "cliclick")
    
    # 目錄路徑
    export CONFIG_FONT_BITMAP_DIR=$(get_directory "font_bitmap")
    local export_result_name=$(get_config ".directories.export_result")
    export CONFIG_EXPORT_DIR="$(get_directory "font_bitmap")/$export_result_name"
    
    # 配置文件路徑
    local project_root=$(get_path "project_root")
    export CONFIG_FONTS_CONFIG_FILE="$project_root/config/shoebox-config/fonts-config.json"
    export CONFIG_IMAGE_HEIGHTS_FILE="$project_root/config/shoebox-config/image-heights.json"
    
    # 延遲設定
    export CONFIG_FINDER_OPEN_DELAY=$(get_delay "finder_open")
    export CONFIG_SHOEBOX_OPEN_DELAY=$(get_delay "shoebox_open")
    export CONFIG_FILE_GENERATION_DELAY=$(get_delay "file_generation")
    export CONFIG_AUTO_CONTINUE_DELAY=$(get_delay "auto_continue")
}

# 驗證配置文件
validate_config() {
    echo "🔍 驗證配置文件..."
    
    # 檢查必要路徑是否存在
    local project_root=$(get_path "project_root")
    if [ ! -d "$project_root" ]; then
        echo "❌ 專案根目錄不存在: $project_root"
        return 1
    fi
    
    local shoebox_app=$(get_path "shoebox_app")
    if [ ! -d "$shoebox_app" ]; then
        echo "⚠️  警告: ShoeBox 應用程式路徑可能不正確: $shoebox_app"
    fi
    
    local cliclick=$(get_path "cliclick")
    if [ ! -f "$cliclick" ]; then
        echo "⚠️  警告: cliclick 路徑可能不正確: $cliclick"
    fi
    
    echo "✅ 配置驗證完成"
    return 0
}

# 顯示當前配置摘要
show_config_summary() {
    export_config_to_env  # 確保環境變數已設定
    echo "📋 當前配置摘要:"
    echo "   專案根目錄: $(get_path "project_root")"
    echo "   ShoeBox 應用: $(get_path "shoebox_app")"
    echo "   字體目錄: $(get_directory "font_bitmap")"
    echo "   輸出目錄: $CONFIG_EXPORT_DIR"
    echo "   支援字體: $(get_config ".supported_fonts | join(\", \")")"
}
