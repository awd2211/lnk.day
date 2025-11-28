// Offscreen document for clipboard operations
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'OFFSCREEN_COPY') {
    const textarea = document.createElement('textarea');
    textarea.value = message.text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
});
