// Domains to close
const SOCIAL_MEDIA_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'linkedin.com',
  'pinterest.com',
  'snapchat.com'
];

function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

function isLocalhost(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'localhost' || 
           urlObj.hostname === '127.0.0.1' || 
           urlObj.hostname.startsWith('localhost:') ||
           urlObj.hostname.startsWith('127.0.0.1:');
  } catch (e) {
    return false;
  }
}

function isSocialMedia(url) {
  const domain = getDomain(url);
  return SOCIAL_MEDIA_DOMAINS.some(socialDomain => 
    domain === socialDomain || domain.endsWith('.' + socialDomain)
  );
}

async function mergeWindows() {
  try {
    // Get all windows
    const windows = await chrome.windows.getAll({ populate: true });
    
    if (windows.length <= 1) {
      // Show notification if only one window
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Merge Windows Plus',
        message: 'Only one window open. Nothing to merge.'
      });
      return;
    }

    // Find the main window (usually the focused one or the first one)
    const focusedWindow = windows.find(w => w.focused) || windows[0];
    const mainWindowId = focusedWindow.id;
    
    // Collect all tabs and categorize them
    const tabsToMove = [];
    const tabsToClose = [];
    const seenUrls = new Set();
    const localhostTabs = [];
    let movedCount = 0;
    let closedCount = 0;
    
    // First pass: process main window tabs
    for (const window of windows) {
      if (window.id === mainWindowId && window.tabs) {
        for (const tab of window.tabs) {
          if (!tab.url || !tab.url.startsWith('http')) continue;
          
          const normalizedUrl = tab.url.split('#')[0].split('?')[0];
          
          if (isSocialMedia(tab.url)) {
            tabsToClose.push(tab.id);
          } else if (isLocalhost(tab.url)) {
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl);
              localhostTabs.push(tab);
            } else {
              tabsToClose.push(tab.id);
            }
          } else {
            if (seenUrls.has(normalizedUrl)) {
              tabsToClose.push(tab.id);
            } else {
              seenUrls.add(normalizedUrl);
            }
          }
        }
      }
    }
    
    // Second pass: process tabs from other windows
    for (const window of windows) {
      if (window.id !== mainWindowId && window.tabs) {
        for (const tab of window.tabs) {
          if (!tab.url || !tab.url.startsWith('http')) continue;
          
          const normalizedUrl = tab.url.split('#')[0].split('?')[0];
          
          if (isSocialMedia(tab.url)) {
            tabsToClose.push(tab.id);
          } else if (isLocalhost(tab.url)) {
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl);
              localhostTabs.push(tab);
              // Only move if not already in main window
              if (tab.windowId !== mainWindowId) {
                tabsToMove.push(tab.id);
              }
            } else {
              tabsToClose.push(tab.id);
            }
          } else {
            if (seenUrls.has(normalizedUrl)) {
              tabsToClose.push(tab.id);
            } else {
              seenUrls.add(normalizedUrl);
              tabsToMove.push(tab.id);
            }
          }
        }
      }
    }

    // Close tabs (social media, duplicates)
    if (tabsToClose.length > 0) {
      try {
        await chrome.tabs.remove(tabsToClose);
        closedCount = tabsToClose.length;
      } catch (error) {
        console.warn('Some tabs may have already been closed:', error);
      }
    }

    // Move tabs to main window
    if (tabsToMove.length > 0) {
      try {
        await chrome.tabs.move(tabsToMove, { windowId: mainWindowId, index: -1 });
        movedCount = tabsToMove.length;
      } catch (error) {
        console.warn('Error moving tabs:', error);
      }
    }

    // Close empty windows (except main window)
    // Get fresh list of windows after tab operations
    const remainingWindows = await chrome.windows.getAll();
    for (const window of remainingWindows) {
      if (window.id !== mainWindowId) {
        try {
          // Check if window still exists and get its tabs
          const tabs = await chrome.tabs.query({ windowId: window.id });
          if (tabs.length === 0) {
            // Window exists but is empty, remove it
            await chrome.windows.remove(window.id);
          }
        } catch (error) {
          // Ignore errors for windows that no longer exist (auto-closed by Chrome)
          // Only log if it's a different type of error
          if (!error.message || !error.message.includes('No window with id')) {
            console.warn('Error checking/removing window:', error);
          }
        }
      }
    }
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Merge Windows Plus',
      message: `Merged ${movedCount} tab(s), closed ${closedCount} tab(s)`
    });
    
  } catch (error) {
    console.error('Error merging windows:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Merge Windows Plus',
      message: 'Error: ' + error.message
    });
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  mergeWindows();
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'merge-windows') {
    mergeWindows();
  }
});
