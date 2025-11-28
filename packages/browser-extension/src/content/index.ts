/**
 * Content script for lnk.day extension
 * Handles text selection and context menu interactions
 */

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SELECTED_TEXT':
      const selection = window.getSelection()?.toString() || '';
      sendResponse({ text: selection });
      break;

    case 'GET_PAGE_INFO':
      sendResponse({
        url: window.location.href,
        title: document.title,
        description: getMetaDescription(),
        ogImage: getOgImage(),
      });
      break;

    case 'HIGHLIGHT_LINKS':
      highlightShortLinks();
      sendResponse({ success: true });
      break;

    case 'SHOW_NOTIFICATION':
      showNotification(message.payload);
      sendResponse({ success: true });
      break;
  }

  return true;
});

function getMetaDescription(): string {
  const meta = document.querySelector('meta[name="description"]');
  return meta?.getAttribute('content') || '';
}

function getOgImage(): string {
  const og = document.querySelector('meta[property="og:image"]');
  return og?.getAttribute('content') || '';
}

function highlightShortLinks(): void {
  // Find all lnk.day links on the page
  const links = document.querySelectorAll('a[href*="lnk.day"]');

  links.forEach((link) => {
    if (!link.classList.contains('lnk-highlighted')) {
      link.classList.add('lnk-highlighted');

      // Add a small badge
      const badge = document.createElement('span');
      badge.className = 'lnk-badge';
      badge.textContent = 'lnk';
      badge.style.cssText = `
        display: inline-block;
        background: #2563eb;
        color: white;
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 3px;
        margin-left: 4px;
        font-weight: 600;
        vertical-align: middle;
      `;
      link.appendChild(badge);
    }
  });
}

function showNotification(options: { title: string; message: string; type?: 'success' | 'error' }): void {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = 'lnk-toast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${options.type === 'error' ? '#ef4444' : '#22c55e'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: lnk-slide-in 0.3s ease;
  `;

  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${options.type === 'error'
        ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
        : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
    </svg>
    <div>
      <div style="font-weight: 600;">${options.title}</div>
      <div style="opacity: 0.9; font-size: 12px;">${options.message}</div>
    </div>
  `;

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes lnk-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes lnk-slide-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'lnk-slide-out 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize
console.log('lnk.day content script loaded');
