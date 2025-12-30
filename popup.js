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

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = isError ? 'error' : 'success';
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

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
      showStatus('Only one window open. Nothing to merge.');
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
    const remainingWindows = await chrome.windows.getAll();
    for (const window of remainingWindows) {
      if (window.id !== mainWindowId) {
        try {
          const tabs = await chrome.tabs.query({ windowId: window.id });
          if (tabs.length === 0) {
            await chrome.windows.remove(window.id);
          }
        } catch (error) {
          console.warn('Error checking/removing window:', error);
        }
      }
    }
    
    showStatus(`Merged ${movedCount} tab(s), closed ${closedCount} tab(s)`);
    
  } catch (error) {
    console.error('Error merging windows:', error);
    showStatus('Error: ' + error.message, true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mergeBtn').addEventListener('click', mergeWindows);
});
