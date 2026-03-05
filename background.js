browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSessionInfo') {
    browser.webfuseSession.getSessionInfo()
      .then((info) => {
        sendResponse({ sessionInfo: info });
      })
      .catch((err) => {
        sendResponse({ sessionInfo: null, error: err.message });
      });
    return true;
  }
});
