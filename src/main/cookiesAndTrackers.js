const { ipcMain, session } = require('electron');
const WindowManager = require('./WindowManager');

const TRACKERS = [

  "*://*.doubleclick.net/*",
  "*://*.googlesyndication.com/*",
  "*://*.google-analytics.com/*",
  "*://*.adservice.google.com/*",
  "*://*.googletagmanager.com/*",
  "*://*.googletagservices.com/*",
  "*://*.googleadservices.com/*",
  "*://*.pagead2.googlesyndication.com/*",

  "*://*.facebook.com/tr*",
  "*://*.facebook.net/signals/*",
  "*://*.connect.facebook.net/*",
  "*://*.pixel.facebook.com/*",

  "*://*.hotjar.com/*",
  "*://*.clarity.ms/*",
  "*://*.fullstory.com/*",
  "*://*.mixpanel.com/*",
  "*://*.segment.io/*",
  "*://*.segment.com/*",
  "*://*.amplitude.com/*",
  "*://*.heapanalytics.com/*",
  "*://*.mouseflow.com/*",
  "*://*.crazyegg.com/*",

  "*://*.amazon-adsystem.com/*",
  "*://*.adsrvr.org/*",
  "*://*.adnxs.com/*",
  "*://*.rubiconproject.com/*",
  "*://*.criteo.com/*",
  "*://*.criteo.net/*",
  "*://*.outbrain.com/*",
  "*://*.taboola.com/*",
  "*://*.pubmatic.com/*",
  "*://*.openx.net/*",
  "*://*.casalemedia.com/*",
  "*://*.moatads.com/*",
  "*://*.serving-sys.com/*",

  "*://*.ads-twitter.com/*",
  "*://*.analytics.twitter.com/*",
  "*://*.t.co/i/*",
  "*://*.snap.licdn.com/*",
  "*://*.linkedin.com/li/track*",
  "*://*.ads.pinterest.com/*",
  "*://*.analytics.tiktok.com/*",

  "*://*.scorecardresearch.com/*",
  "*://*.quantserve.com/*",
  "*://*.bluekai.com/*",
  "*://*.demdex.net/*",
  "*://*.krxd.net/*",
  "*://*.bidswitch.net/*",
  "*://*.sharethis.com/*",
  "*://*.addthis.com/*",
];


function setupTrackerBlocking() {
  const ses = session.fromPartition('persist:main');
  
  ses.webRequest.onBeforeRequest({ urls: TRACKERS }, (details, callback) => callback({ cancel: true }));
}


function registerCookieAndTrackerIPC() {

 let blockTrackers = true;

  ipcMain.on("setBlockTrackers", (event, enabled) => {
    blockTrackers = enabled;
    const ses = session.fromPartition('persist:main');


    // Simple ish list of trackers to block -> might expand
    if (enabled) {
           ses.webRequest.onBeforeRequest({ urls: TRACKERS }, (details, callback) => {

        callback({ cancel: true });
      });
   } 
   
   else {
      ses.webRequest.onBeforeRequest(null);
    }
  });


  ipcMain.handle("getCookies", async (event) => {
    const ses = session.fromPartition('persist:main');
    const cookies = await ses.cookies.get({});
    const data = WindowManager.getAllWindows();
    const firstPartyDomains = new Set();


    for (const { tabManager } of data) {

      for (const tab of tabManager.tabs) {

        if (tab.address) {

          try {
            const hostname = new URL(tab.address).hostname.replace(/^www\./, '');
            firstPartyDomains.add(hostname);
          } 
          
          catch {}
        }
      }
    }

    return cookies.map(c => {
      const cookieDomain = c.domain.replace(/^\./, '');
      const isThirdParty = ![...firstPartyDomains].some(d => cookieDomain === d || cookieDomain.endsWith('.' + d) || d.endsWith('.' + cookieDomain));
      return { ...c, isThirdParty };
    });
  });

  ipcMain.handle("deleteCookie", async (event, url, name) => {
    const ses = session.fromPartition('persist:main');
    await ses.cookies.remove(url, name);
    await ses.cookies.flushStore();
  });

  ipcMain.handle("deleteCookiesByDomain", async (event, domain) => {
    const ses = session.fromPartition('persist:main');

   
    for (const protocol of ['https', 'http']) {
      const origin = `${protocol}://${domain}`;
      try {
        await ses.clearStorageData({
          origin,
          storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage', 'shadercache'],
        });
      } 
      
      catch (e) { }
    }

    const remaining = await ses.cookies.get({});

    for (const cookie of remaining) {

      const cookieDomain = cookie.domain.replace(/^\./, '');
      if (cookieDomain === domain || cookieDomain.endsWith('.' + domain)) {
        const proto = cookie.secure ? 'https' : 'http';
        const url = `${proto}://${cookieDomain}${cookie.path || '/'}`;

        try { await ses.cookies.remove(url, cookie.name); } 
        
        catch {}
      }
    }

    await ses.cookies.flushStore();


    const allWindows = WindowManager.getAllWindows();
    
    for (const { tabManager } of allWindows) {

      for (const tab of tabManager.tabs) {
        if (!tab.address || !tab.contentView || !tab.isActive) continue;

        try {
          const tabDomain = new URL(tab.address).hostname.replace(/^www\./, '');
          if (tabDomain === domain || tabDomain.endsWith('.' + domain)) {
            tab.contentView.webContents.reload();
          }
        }
         catch {}
      }
    }
  });

  ipcMain.handle("clearAllCookies", async (event) => {
    const ses = session.fromPartition('persist:main');
    const cookies = await ses.cookies.get({});

    for (const cookie of cookies) {
      const protocol = cookie.secure ? 'https' : 'http';
      const domain = cookie.domain.replace(/^\./, '');
      const url = `${protocol}://${domain}${cookie.path || '/'}`;
      await ses.cookies.remove(url, cookie.name);
    }

    await ses.cookies.flushStore();
  });

  ipcMain.handle("clearThirdPartyCookies", async (event) => {

    const ses = session.fromPartition('persist:main');
    const allCookies = await ses.cookies.get({});
    const data = WindowManager.getAllWindows();
    const firstPartyDomains = new Set();

    for (const { tabManager } of data) {
      for (const tab of tabManager.tabs) {

        if (tab.address) {
          try {
            const hostname = new URL(tab.address).hostname.replace(/^www\./, '');
            firstPartyDomains.add(hostname);
          } 
          
          catch {}
        }
      }
    }

    for (const cookie of allCookies) {
      const cookieDomain = cookie.domain.replace(/^\./, '');
      const isThirdParty = ![...firstPartyDomains].some(d => cookieDomain === d || cookieDomain.endsWith('.' + d) || d.endsWith('.' + cookieDomain));

      if (isThirdParty) {
        const protocol = cookie.secure ? 'https' : 'http';
        const url = `${protocol}://${cookieDomain}${cookie.path || '/'}`;
        await ses.cookies.remove(url, cookie.name);
      }
    }

    await ses.cookies.flushStore();
  });

}

module.exports = { setupTrackerBlocking, registerCookieAndTrackerIPC };
