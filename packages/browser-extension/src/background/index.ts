/**
 * Background service worker for lnk.day extension
 */

import { api, CreateLinkParams, Link } from '../utils/api';

// Initialize API on startup
chrome.runtime.onInstalled.addListener(async () => {
  await api.init();

  // Create context menu items
  chrome.contextMenus.create({
    id: 'shorten-link',
    title: 'Shorten with lnk.day',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'shorten-page',
    title: 'Shorten this page',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'shorten-selection',
    title: 'Shorten selected URL',
    contexts: ['selection'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let urlToShorten: string | undefined;

  switch (info.menuItemId) {
    case 'shorten-link':
      urlToShorten = info.linkUrl;
      break;
    case 'shorten-page':
      urlToShorten = info.pageUrl || tab?.url;
      break;
    case 'shorten-selection':
      // Try to parse selection as URL
      const selection = info.selectionText;
      if (selection && isValidUrl(selection)) {
        urlToShorten = selection;
      }
      break;
  }

  if (urlToShorten) {
    try {
      await api.init();
      const link = await api.createLink({ originalUrl: urlToShorten });

      // Copy to clipboard
      await copyToClipboard(link.shortUrl);

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Link Shortened!',
        message: `${link.shortUrl} copied to clipboard`,
      });
    } catch (error: any) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Error',
        message: error.message || 'Failed to shorten link',
      });
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => sendResponse({ error: error.message }));
  return true; // Indicates async response
});

async function handleMessage(
  message: { type: string; payload?: any },
  sender: chrome.runtime.MessageSender
): Promise<any> {
  await api.init();

  switch (message.type) {
    case 'CREATE_LINK':
      return api.createLink(message.payload as CreateLinkParams);

    case 'GET_RECENT_LINKS':
      return api.getRecentLinks(message.payload?.limit);

    case 'GET_LINK_STATS':
      return api.getLinkStats(message.payload.linkId);

    case 'SEARCH_LINKS':
      return api.searchLinks(message.payload.query);

    case 'DELETE_LINK':
      return api.deleteLink(message.payload.linkId);

    case 'GET_CAMPAIGNS':
      return api.getCampaigns();

    case 'GET_TAGS':
      return api.getTags();

    case 'SET_API_KEY':
      api.setApiKey(message.payload.apiKey);
      return { success: true };

    case 'VALIDATE_API_KEY':
      return { valid: await api.validateApiKey(message.payload.apiKey) };

    case 'GET_CURRENT_TAB':
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return { url: tab?.url, title: tab?.title };

    case 'COPY_TO_CLIPBOARD':
      await copyToClipboard(message.payload.text);
      return { success: true };

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str.startsWith('http') ? str : `https://${str}`);
    return true;
  } catch {
    return false;
  }
}

async function copyToClipboard(text: string): Promise<void> {
  // Use offscreen document for clipboard access in service worker
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Copy shortened URL to clipboard',
    });
  } catch {
    // Document may already exist
  }

  await chrome.runtime.sendMessage({
    type: 'OFFSCREEN_COPY',
    text,
  });
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'shorten-current-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      try {
        await api.init();
        const link = await api.createLink({
          originalUrl: tab.url,
          title: tab.title,
        });
        await copyToClipboard(link.shortUrl);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Link Shortened!',
          message: `${link.shortUrl} copied to clipboard`,
        });
      } catch (error: any) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Error',
          message: error.message,
        });
      }
    }
  }
});

console.log('lnk.day background service worker started');
