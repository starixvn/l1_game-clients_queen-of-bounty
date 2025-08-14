#!/usr/bin/env python3
"""文件同步工具 - 將指定資料夾內容同步到 Cocos Creator 專案"""
"""folder-mapping.json → 讀取 "symbol-spines": "src/assets/resources/symbol-spines"
                    ↓
檢查 source_folder/symbol-spines 是否存在
                    ↓
如果存在 → 複製所有文件到目標位置
                    ↓
複製文件時 → 自動清理同名 .meta 文件
                    ↓
如果不存在 → 記錄警告並跳過
                    ↓
最後顯示操作結果
"""

import os
import shutil
import json
import sys
from pathlib import Path

class FileSynchronizer:
    def __init__(self):
        self.source_folder = "/Users/jaysonCheng/Downloads/Test"
        self.project_root = "/Users/jaysonCheng/pentagon/queen-of-bounty"
        self.operation_log = []
        self.folder_mapping = self._load_mapping()
    
    def _load_mapping(self):
        try:
            with open("folder-mapping.json", 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("❌ 找不到 folder-mapping.json")
            sys.exit(1)
    
    def _log(self, status, operation, source="", destination=""):
        self.operation_log.append([status, operation, source, destination])
    
    def sync_folder(self, source_path, destination_path):
        source = Path(source_path)
        destination = Path(destination_path)
        
        if not source.exists():
            self._log("⚠️", "來源不存在", str(source))
            return
        
        if not destination.exists():
            destination.mkdir(parents=True)
            self._log("📁", "建立資料夾", "", str(destination))
        
        for item in source.iterdir():
            dest_item = destination / item.name
            
            if item.is_dir():
                self.sync_folder(item, dest_item)
            else:
                shutil.copy2(item, dest_item)
                self._log("✅", "複製文件", str(item), str(dest_item))
                
                # 清理 meta 文件
                meta_file = dest_item.with_suffix(dest_item.suffix + ".meta")
                if meta_file.exists():
                    meta_file.unlink()
                    self._log("🗑️", "刪除 .meta", "", str(meta_file))
    
    def _print_table(self, data, headers):
        if not data:
            return
        
        # 計算列寬
        widths = [len(h) + 2 for h in headers]
        for row in data:
            for i, cell in enumerate(row):
                if i < len(widths):
                    widths[i] = max(widths[i], len(str(cell)) + 2)
        
        def border():
            print("+" + "+".join("-" * w for w in widths) + "+")
        
        border()
        print("|" + "|".join(f" {h:<{w-1}}" for h, w in zip(headers, widths)) + "|")
        border()
        
        for row in data:
            line = "|"
            for i, cell in enumerate(row):
                if i < len(widths):
                    line += f" {str(cell):<{widths[i]-1}}|"
            print(line)
        border()
    
    def run(self):
        print("🚀 開始同步...")
        
        for key, dest_path in self.folder_mapping.items():
            source_path = os.path.join(self.source_folder, key)
            full_dest_path = os.path.join(self.project_root, dest_path)
            print(f"\n📂 {key} -> {dest_path}")
            self.sync_folder(source_path, full_dest_path)
        
        if self.operation_log:
            print("\n" + "="*80)
            print("📊 操作結果")
            print("="*80)
            self._print_table(self.operation_log, ["狀態", "操作", "來源", "目標"])
            print("="*80)
        
        print(f"\n✅ 完成！共 {len(self.operation_log)} 個操作")

if __name__ == "__main__":
    try:
        FileSynchronizer().run()
    except KeyboardInterrupt:
        print("\n⚠️ 已中斷")
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")
