const { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu, session  } = require('electron');
const path = require('node:path');
const WindowResizing = require("./WindowResizing")
const TabManager = require('../tabs/TabManager');
const Navigation = require('../addressBar/Navigation');
const SettingsManager = require('../settings/SettingsManager');
const WindowManager = require('./WindowManager');

// const TabManager = require("./")


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}





const ipcSetup = () => {
  const getTabManager = (event) => {
    const data = WindowManager.getManagerBySend(event.sender);
    return data ? data.tabManager : null;
  }

  const getManager = (event) => {
    return WindowManager.getManagerBySend(event.sender);
  };

   ipcMain.on("createTab", (event) => {
      const tm = getTabManager(event);
      if (tm) tm.createTab();
  });

  ipcMain.on("switchTab", (event, tabID) => {
      const tm = getTabManager(event);
      if (tm) tm.switchTab(tabID);
  });
  
  ipcMain.on("reorderTabs", (event, start, end) => {
      const tm = getTabManager(event);
      if (tm) tm.reorderTabs(start, end);
  });

  ipcMain.on("closeTab", (event, tabID) => {
      const tm = getTabManager(event);
      if (tm) tm.closeTab(tabID);
  });

  ipcMain.on("hibernateTab", (event, tabID) => {
      const tm = getTabManager(event);
      if (tm) tm.sleep(tabID);
  });

  ipcMain.on("updateDefaultSite", (event, site) => {
      const tm = getTabManager(event);
      if (tm) tm.updateDefaultSite(site);
  });
  


  // Navigation
  ipcMain.on("search", (event, address) => {
    const tm = getTabManager(event);
    if (tm) Navigation.search(address, tm.getMainTab());
  });

  ipcMain.on("tBAction", (event, action) => {
    const tm = getTabManager(event);
    if (tm) Navigation.toolbarAction(action, tm.getMainTab());
  });


      // in page
      
  ipcMain.on("searchInPage", (event, phrase, options) => {
    const tm = getTabManager(event);
    if (!tm) return;
    const mainTab = tm.getMainTab();

    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {

      if (phrase) {
  
        mainTab.contentView.webContents.findInPage(phrase, options || {});
    }
    
      else {1
        mainTab.contentView.webContents.stopFindInPage('clearSelection');
      }
    }
  });

  ipcMain.on("stopFindInPage", (event) => {
    const tm = getTabManager(event);
    if (!tm) return;
    const mainTab = tm.getMainTab();


    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {
      mainTab.contentView.webContents.stopFindInPage('clearSelection');
    }
  });

   ipcMain.on("focusUI", (event) => {
    const data = getManager(event);
    if (data && data.ui && data.ui.webContents) {
        data.ui.webContents.focus();
    }
  });

  // Settings
  ipcMain.on("showSettingsMenu", (event) => {
    const data = getManager(event);
    if (!data) return;
    const settingsView = SettingsManager.openSettingsMenu(data.window);
    data.tabManager.setSettingsUI(settingsView);


    
    WindowManager.registerWebContents(settingsView.webContents.id, data.window.id);

    settingsView.webContents.on('destroyed', () => {
        WindowManager.unregisterWebContents(settingsView.webContents.id);
    });
    


    settingsView.webContents.once('did-finish-load', () => {
      data.tabManager.sendTabData();
    });
  });

  ipcMain.on('showContextMenu', (event, vars) => {
    const data = getManager(event);
    if (!data) return;
    const { tabManager, window } = data;

    const targetTab = tabManager.tabs[vars.tabIndex];

    const cmTemplate = [
      {
        label: 'Close Tab',
        click: () => {

          tabManager.closeTab(vars.tabIndex);

        }
      },

      {
        label: 'Reload Tab',
        click: () => {
          if (vars.tabIndex !== undefined && tabManager.tabs[vars.tabIndex]) {
            tabManager.tabs[vars.tabIndex].contentView.webContents.reload();
          }
        }
      },
      { type: 'separator' },
      {

        label: 'Put Tab to Sleep',

        click: () => {
          tabManager.sleep(vars.tabIndex)
        }
      },
      {

        label: targetTab.keepActive ? "Dont Keep Tab Active" : "Keep Tab Active",

        click: () => { tabManager.toggleKeepActive(vars.tabIndex); }
      },

    ];

    const menu = Menu.buildFromTemplate(cmTemplate);

    menu.popup({
      window: window,
      x: vars.x,
      y: vars.y
    });
  });

  ipcMain.on('tabPopOff', (event, { tabIndex }) => {
      const data = getManager(event);
      if (!data) return;

      const { tabManager, window } = data;
      const tab = tabManager.popTab(tabIndex);

      if (tab) {
          WindowManager.createWindow(tab);
          
          if (tabManager.tabs.length === 0) {
              window.close();
          }
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

  ipcMain.on('tabTransferOut', (event, { tabIndex, screenX, screenY }) => {
    const data = getManager(event);
    
    if (!data) return;

    const { tabManager, window } = data;
    const sourceWindowId = window.id;

    const targetData = WindowManager.getWindowAtPoint(screenX, screenY, sourceWindowId);
    const tab = tabManager.popTab(tabIndex);
    
    if (!tab) return;

    if (targetData) {
        targetData.tabManager.stickTab(tab);
        targetData.window.focus();
    } 

    else {
        WindowManager.createWindow(tab);
    }

    if (tabManager.tabs.length === 0) {
        window.close();
    }
  });



 let blockTrackers = true;

  ipcMain.on("setBlockTrackers", (event, enabled) => {
    blockTrackers = enabled;
    const ses = session.fromPartition('persist:main');


    // Simple ish list of trackers to block -> might expand
    if (enabled) {
      ses.webRequest.onBeforeRequest({ urls: ["*://*.doubleclick.net/*", "*://*.googlesyndication.com/*", "*://*.facebook.com/tr*", "*://*.google-analytics.com/*", "*://*.adservice.google.com/*"] }, (details, callback) => {
        callback({ cancel: true });
      });
   } 
   
   else {
      ses.webRequest.onBeforeRequest(null);
    }
  });


}


const ALWAYS_VERIFY = new Set(); 

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  let hostname = '';
  try { hostname = new URL(url).hostname; } catch {}

  if (ALWAYS_VERIFY.has(hostname)) {
    callback(false); 
    return;
  }

  console.warn(`[SSL] Ignoring cert error ${error} for ${hostname}`);
  event.preventDefault();
  callback(true);
});


app.whenReady().then(() => {

  ipcSetup();
  WindowManager.createWindow();

  const ses = session.fromPartition('persist:main');
  
  ses.webRequest.onBeforeRequest({ urls: [
    "*://*.doubleclick.net/*", "*://*.googlesyndication.com/*",
    "*://*.facebook.com/tr*", "*://*.google-analytics.com/*",
   "*://*.adservice.google.com/*"
  ] }, (details, callback) => callback({ cancel: true }));

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) {
      WindowManager.createWindow();
    }
  });
});

app.on('window-all-closed', () => {

  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
