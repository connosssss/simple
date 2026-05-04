const { webFrame } = require('electron');

const polyfill = `
  if (typeof chrome !== 'undefined') {
    if (chrome.storage && chrome.storage.local && !chrome.storage.sync) {
      chrome.storage.sync = chrome.storage.local;
    }
    
    if (!chrome.management) {
    
      chrome.management = {
        getAll: () => Promise.resolve([]),
        getSelf: () => Promise.resolve({ id: '', name: '', version: '0', enabled: true, installType: 'development' }),
        onEnabled: { addListener: () => {}, removeListener: () => {} },
        onDisabled: { addListener: () => {}, removeListener: () => {} },
        onInstalled: { addListener: () => {}, removeListener: () => {} },
        onUninstalled: { addListener: () => {}, removeListener: () => {} },
      };
      
    }

    const originalSendMessage = chrome.runtime.sendMessage;
    if (originalSendMessage) {
    
      chrome.runtime.sendMessage = function(...args) {
        let callback = null;

        
        if (typeof args[args.length - 1] === 'function') {
          callback = args.pop();
        }

        const promise = new Promise((resolve) => {
        
          try {
            const result = originalSendMessage.apply(this, args);
            if (result instanceof Promise) {
              result.then(data => {
                if (!data) {
                  resolve({ isSupportingCurrentDomain: true, trackAds: 0, totalAds: 0, adCount: 0 });
                } else {
                  resolve(data);
                }
              }).catch(() => {
                resolve({ isSupportingCurrentDomain: true, trackAds: 0, totalAds: 0, adCount: 0 });
              });
            }
            
            else {
              resolve({ isSupportingCurrentDomain: true, trackAds: 0, totalAds: 0, adCount: 0 });
            }
          }
          catch(e) {
            resolve({ isSupportingCurrentDomain: true, trackAds: 0, totalAds: 0, adCount: 0 });
          }
        });

        if (callback) {
          promise.then(callback);
          return true; 
        }
        
        return promise;
      };
    }
  }
`;

process.once('loaded', () => {
  webFrame.executeJavaScript(polyfill);
});
