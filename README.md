# Merge Windows Plus Chrome Extension

A Chrome extension that merges all browser windows into the main window, removes duplicate tabs, merges localhost tabs, and closes social media tabs.

## Features

- **Merge Windows**: Combines all open windows into the main (focused) window
- **Remove Duplicates**: Automatically closes duplicate tabs based on URL
- **Merge Localhost**: Groups all localhost tabs together
- **Close Social Media**: Automatically closes tabs from YouTube, Twitter/X, Facebook, Instagram, TikTok, Reddit, LinkedIn, Pinterest, and Snapchat
- **Keyboard Shortcut**: Press `Cmd+Ctrl+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux) to quickly merge windows

## Installation

### For Development (Unpacked Extension)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `MergeWindowsPlus` folder
5. The extension icon will appear in your toolbar

### For Distribution (Packaged Extension)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Pack extension"
4. Select the `MergeWindowsPlus` folder as the extension root directory
5. Leave the private key field empty (for first-time packaging)
6. Click "Pack Extension"
7. A `.crx` file and `.pem` key file will be created

Alternatively, you can create a ZIP file for Chrome Web Store submission:

```bash
# Exclude development files and create a clean package
zip -r MergeWindowsPlus.zip . -x "*.git*" "*.DS_Store" "generate-icons.html" "popup.html" "popup.js"
```

## Usage

- **Click the extension icon** in your Chrome toolbar to merge windows
- **Keyboard shortcut**: Press `Cmd+Ctrl+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux)
- Status notifications will appear showing the results

## Permissions

- **tabs**: Required to access and manage browser tabs
- **windows**: Required to access and manage browser windows
- **notifications**: Used to show status messages

## Development

This extension uses Chrome Extension Manifest V3.

### Files

- `manifest.json`: Extension configuration, permissions, and keyboard shortcuts
- `background.js`: Service worker that handles the merge logic and button clicks
- `icons/`: Extension icons (16x16, 48x48, 128x128 PNG files)
- `popup.html` & `popup.js`: Legacy files (no longer used, can be removed)

## Customization

To add or remove social media domains, edit the `SOCIAL_MEDIA_DOMAINS` array in `background.js`.

## Building/Packaging

No build step required! The extension works directly from source. To package for distribution:

1. **For Chrome Web Store**: Create a ZIP file excluding development files
2. **For local distribution**: Use Chrome's "Pack extension" feature to create a `.crx` file
