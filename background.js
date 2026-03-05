// Background service worker
// Listens for session info requests from the popup

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSessionInfo') {
    browser.webfuseSession.getSessionInfo().then((info) => {
      sendResponse({ sessionInfo: info });
    });
    return true; // Keep message channel open for async response
  }
});
