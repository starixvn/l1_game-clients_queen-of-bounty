#!/bin/bash

# Run get-height.js script
# This script is designed to be called from ui.vision macro

echo "Starting get-height.js execution..."
echo "Working directory: $(pwd)"
echo "Script path: /Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool/src/scripts/shoebox-auto/get-height.js"

# Change to the assets-automation-tool directory
cd /Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool

# Execute the get-height.js script using node
/usr/local/bin/node /Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool/src/scripts/shoebox-auto/get-height.js

# Check the exit code
if [ $? -eq 0 ]; then
    echo "✅ get-height.js execution completed successfully"
    exit 0
else
    echo "❌ get-height.js execution failed"
    exit 1
fi
