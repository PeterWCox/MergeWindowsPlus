#!/bin/bash

# Package script for Merge Windows Plus Chrome Extension
# Creates a clean ZIP file for Chrome Web Store submission

EXTENSION_NAME="MergeWindowsPlus"
ZIP_NAME="${EXTENSION_NAME}.zip"

echo "📦 Packaging Chrome Extension..."

# Remove old zip if it exists
if [ -f "$ZIP_NAME" ]; then
    rm "$ZIP_NAME"
    echo "🗑️  Removed old package"
fi

# Create zip excluding development files
zip -r "$ZIP_NAME" . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "generate-icons.html" \
    -x "popup.html" \
    -x "popup.js" \
    -x "package.sh" \
    -x "README.md" \
    -x "*.svg" \
    > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Successfully created: $ZIP_NAME"
    echo "📊 Package size: $(du -h "$ZIP_NAME" | cut -f1)"
    echo ""
    echo "📤 Ready for Chrome Web Store submission!"
else
    echo "❌ Failed to create package"
    exit 1
fi
