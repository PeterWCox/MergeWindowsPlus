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
  'snapchat.com',
  'news.google.com',
  'gmail.com',
  'mail.google.com',
  'bbc.com',
  'bbc.co.uk'
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

function isLocalhost3000(url) {
  try {
    const urlObj = new URL(url);
    return (urlObj.hostname === 'localhost' && urlObj.port === '3000') ||
           (urlObj.hostname === '127.0.0.1' && urlObj.port === '3000') ||
           urlObj.hostname === 'localhost:3000' ||
           urlObj.hostname === '127.0.0.1:3000' ||
           url.includes('localhost:3000') ||
           url.includes('127.0.0.1:3000');
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
    
    if (windows.length === 0) {
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
    
    // Process ALL windows - close social media tabs in every window (including main)
    for (const window of windows) {
      if (!window.tabs) continue;
      
      for (const tab of window.tabs) {
        if (!tab.url || !tab.url.startsWith('http')) continue;
        
        const normalizedUrl = tab.url.split('#')[0].split('?')[0];
        
        // ALWAYS close social media tabs in ALL windows (including main window)
        if (isSocialMedia(tab.url)) {
          tabsToClose.push(tab.id);
          continue;
        }
        
        // Close localhost:3000 tabs
        if (isLocalhost3000(tab.url)) {
          tabsToClose.push(tab.id);
          continue;
        }
        
        // Handle other localhost tabs
        if (isLocalhost(tab.url)) {
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            localhostTabs.push(tab);
            // Only move if not already in main window
            if (window.id !== mainWindowId) {
              tabsToMove.push(tab.id);
            }
          } else {
            tabsToClose.push(tab.id);
          }
          continue;
        }
        
        // Handle regular tabs - check for duplicates
        if (window.id === mainWindowId) {
          // In main window, mark as seen
          if (seenUrls.has(normalizedUrl)) {
            tabsToClose.push(tab.id);
          } else {
            seenUrls.add(normalizedUrl);
          }
        } else {
          // In other windows, check for duplicates
          if (seenUrls.has(normalizedUrl)) {
            tabsToClose.push(tab.id);
          } else {
            seenUrls.add(normalizedUrl);
            tabsToMove.push(tab.id);
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
    // Only if there are multiple windows
    if (windows.length > 1) {
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
    }
    
    // Show notification
    let message = '';
    if (windows.length <= 1) {
      if (closedCount > 0) {
        message = `Closed ${closedCount} social media tab(s)`;
      } else {
        message = 'No social media tabs to close';
      }
    } else {
      message = `Merged ${movedCount} tab(s), closed ${closedCount} tab(s)`;
    }
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Merge Windows Plus',
      message: message
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
