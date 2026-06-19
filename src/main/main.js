const { app, BaseWindow, BrowserWindow, WebContentsView, ipcMain, Menu, session, dialog } = require('electron');
const path = require('node:path');
const fs = require('fs');



const configureAppStorage = () => {
  if (app.isPackaged) {
    return;
  }

  const devUserDataPath = path.join(app.getPath('appData'), `${app.getName()}-dev`);
  app.setPath('userData', devUserDataPath);
  app.setPath('sessionData', path.join(devUserDataPath, 'session-data'));
};

configureAppStorage();

const Navigation = require('../addressBar/Navigation');
const WindowManager = require('./WindowManager');
const { registerCookieAndTrackerIPC } = require('./cookiesAndTrackers');
const extensionManager = require('../extensions/extensionManager');
const bookmarkManager = require('../bookmarks/bookmarks');
const historyManager = require('../history/history');
const downloadsManager = require('../downloads/downloadsManager');

const INTERNAL_PAGES = new Set(["about://settings", "about://history"]);


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const registerSettingsView = (windowId, tabManager, settingsView) => {
  WindowManager.registerSettingsView(windowId, tabManager, settingsView);
};

const moveTabToWindow = (sourceData, tabIndex, targetData = null) => {
  const { tabManager, window } = sourceData;
  const tab = tabManager.popTab(tabIndex);
  if (!tab) return;

  if (targetData) {
    targetData.tabManager.stickTab(tab);
    targetData.window.focus();
  } else {
    WindowManager.createWindow(tab);
  }

  if (tabManager.tabs.length === 0) {
    window.close();
  }
};

const getThemePath = () => path.join(app.getPath('userData'), 'theme.json');

const ipcSetup = () => {
  const getWindowData = (event) => WindowManager.getManagerBySend(event.sender);
  const getTabManager = (event) => getWindowData(event)?.tabManager ?? null;

  const onTabManager = (channel, handler) => {

    ipcMain.on(channel, (event, ...args) => {
      const tabManager = getTabManager(event);
      if (tabManager) {
        handler(tabManager, event, ...args);
      }

    });

  };

  const onWindowData = (channel, handler) => {

    ipcMain.on(channel, (event, ...args) => {
      const data = getWindowData(event);
      if (data) {
        handler(data, event, ...args);
      }

    });

  };

  const broadcastHistory = () => {
    const historyList = historyManager.getAll();

    for (const data of WindowManager.getAllWindows()) {
      data.ui.webContents.send("updateHistory", historyList);

      const settingsTabs = data.tabManager.getSettingsTabs ? data.tabManager.getSettingsTabs() : data.tabManager.tabs.filter(t => t.isSettingsTab && t.contentView && !t.contentView.webContents.isDestroyed());
      for (const tab of settingsTabs) {
        tab.contentView.webContents.send("updateHistory", historyList);
      }
    }
  };

  ipcMain.on("broadcastHistory", broadcastHistory);

  const broadcastBookmarks = () => {
    const bookmarks = bookmarkManager.getAll();

    for (const data of WindowManager.getAllWindows()) {
      data.ui.webContents.send("updateBookmarks", bookmarks);

      const settingsTabs = data.tabManager.getSettingsTabs ? data.tabManager.getSettingsTabs() : [];
      for (const tab of settingsTabs) {
        tab.contentView.webContents.send("updateBookmarks", bookmarks);
      }
    }
  };

  onTabManager("createTab", (tabManager, event, options) => {
    const address = typeof options === 'string' ? options : (options?.address || "");
    const isSpecial = INTERNAL_PAGES.has(address);
    const newTab = tabManager.createTab(options);
    if (isSpecial && newTab && newTab.isSettingsTab && newTab.contentView) {
      const data = WindowManager.getManagerBySend(event.sender);
      if (data) {
        registerSettingsView(data.window.id, tabManager, newTab.contentView);
      }
    }
  });
  onTabManager("switchTab", (tabManager, event, tabId) => tabManager.switchTab(tabId));
  onTabManager("reorderTabs", (tabManager, event, start, end) => tabManager.reorderTabs(start, end));
  onTabManager("closeTab", (tabManager, event, tabId) => tabManager.closeTab(tabId));
  onTabManager("hibernateTab", (tabManager, event, tabId) => tabManager.sleep(tabId));
  onTabManager("hibernateStack", (tabManager, event, stackId) => tabManager.hibernateStack(stackId));
  onTabManager("updateDefaultSite", (tabManager, event, site) => tabManager.updateDefaultSite(site));
  onTabManager("updateSearchEngine", (tabManager, event, engine) => tabManager.updateSearchEngine(engine));
  onTabManager("updateCloseAfter", (tabManager, event, closeAfter) => {
    const val = parseInt(closeAfter, 10);
    for (const data of WindowManager.getAllWindows()) {
      data.tabManager.updateCloseAfter(val);
    }
  });
  onTabManager("updateUiPosition", (tabManager, event, position) => {
    for (const data of WindowManager.getAllWindows()) {
      data.tabManager.updateUiPosition(position);
    }
  });
  onTabManager("updateShowBookmarkBar", (tabManager, event, enabled) => {
    const nextValue = Boolean(enabled);

    for (const data of WindowManager.getAllWindows()) {
      data.tabManager.showBookmarkBar = nextValue;
      data.tabManager.saveConfig(true);
      data.tabManager.broadcastSettings();
      data.tabManager.resizeWindow();
    }
  });

  // Tab stacking
  onTabManager("createStack", (tabManager, event, tabIndices, parentStackIds) => tabManager.createStack(tabIndices, parentStackIds));
  onTabManager("updateStack", (tabManager, event, stackIds, tabIndex) => tabManager.updateStack(stackIds, tabIndex));
  onTabManager("deleteStack", (tabManager, event, stackId) => tabManager.deleteStack(stackId));
  onTabManager("closeStack", (tabManager, event, stackId) => tabManager.closeStack(stackId));
  onTabManager("removeFromStack", (tabManager, event, tabIndex, depth) => tabManager.removeFromStack(tabIndex, depth));
  onTabManager("renameStack", (tabManager, event, stackId, name) => tabManager.renameStack(stackId, name));
  onTabManager("reorderStack", (tabManager, event, stackId, toIndex) => tabManager.reorderStack(stackId, toIndex));
  onTabManager("moveStack", (tabManager, event, dragStackId, targetStackIds) => tabManager.moveStackIntoStack(dragStackId, targetStackIds));
  onTabManager("moveStackToTab", (tabManager, event, dragStackId, targetTabIndex, parentStackIds) => tabManager.moveStackToTab(dragStackId, targetTabIndex, parentStackIds));

  onWindowData("stackBarsVisible", (data, event, count) => {

    data.tabManager.setStackBarsVisible(count);
    data.tabManager.resizeWindow();

  });

  onWindowData("bookmarkBarVisible", (data, event, visible) => {
    data.tabManager.bookmarkBarVisible = visible;
    data.tabManager.resizeWindow();
  });

  onWindowData("showStackContextMenu", (data, event, vars) => {
    const { tabManager, window } = data;
    const currentName = tabManager.stackNames[vars.stackId] || "";

    const cmTemplate = [
      {
        label: currentName ? `Rename Stack "${currentName}"` : 'Name Stack',
        click: () => {
          data.ui.webContents.send("promptStackName", {
            stackId: vars.stackId,
            currentName: currentName
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Ungroup Stack',
        click: () => {
          tabManager.deleteStack(vars.stackId);
        },


      },
      {
        label: "Hibernate Stack",
        click: () => {
          tabManager.hibernateStack(vars.stackId);
        }
      },
    ];

    const menu = Menu.buildFromTemplate(cmTemplate);
    menu.popup({
      window: window,
      x: vars.x,
      y: vars.y
    });
  });


  ipcMain.on("setDropdownVisible", (event, visible) => {

    const tabManager = getTabManager(event);
    
    if (tabManager && tabManager.setDropdownVisible) {
      tabManager.setDropdownVisible(visible);
    }
  });

  // Navigation
  ipcMain.on("search", (event, address) => {
    const tabManager = getTabManager(event);
    const data = getWindowData(event);
    if (!tabManager || !data) return;

    const trimmedAddress = address.trim();
    const mainTab = tabManager.getMainTab();
    if (!mainTab) return;

    mainTab.isNewTab = false;

    if (INTERNAL_PAGES.has(trimmedAddress.toLowerCase())) {
      const address = trimmedAddress.toLowerCase();
      const settingsView = tabManager.navigateTabToSettings(tabManager.currentIndex, address);

      if (settingsView && tabManager.getMainTab()?.isSettingsTab) {
        registerSettingsView(data.window.id, tabManager, settingsView);
      }
      return;
    }

    if (mainTab.isSettingsTab) {
      tabManager.navigateTabToRegular(tabManager.currentIndex, address);
      return;
    }

    Navigation.search(address, mainTab, tabManager.searchEngine);
  });

  onTabManager("tBAction", (tabManager, event, action) => {
    const mainTab = tabManager.getMainTab();

    if (mainTab && !mainTab.isSettingsTab) {
      mainTab.isNewTab = false;
      Navigation.toolbarAction(action, mainTab);
    }

  });

  onTabManager("bookmark", (tabManager) => {
    const mainTab = tabManager.getMainTab();
    if (!mainTab) return;

    const url = mainTab.address;

    if (bookmarkManager.isBookmarked(url)) {
      bookmarkManager.remove(url);
    }

    else { bookmarkManager.add(url, mainTab.title, mainTab.iconURL); }
    broadcastBookmarks();
  });

  onTabManager("openBookmark", (tabManager, event, url) => {
    const mainTab = tabManager.getMainTab();
    if (!mainTab || !url) return;

    mainTab.isNewTab = false;

    if (mainTab.isSettingsTab) {
      tabManager.navigateTabToRegular(tabManager.currentIndex, url);
      return;
    }

    Navigation.search(url, mainTab, tabManager.searchEngine);
  });

  // in page

  onTabManager("searchInPage", (tabManager, event, phrase, options) => {
    const webContents = tabManager.getMainTab()?.contentView?.webContents;
    if (!webContents) return;

    if (phrase) {
      webContents.findInPage(phrase, options || {});
    }
    else {
      webContents.stopFindInPage('clearSelection');
    }
  });

  onTabManager("stopFindInPage", (tabManager) => {
    const webContents = tabManager.getMainTab()?.contentView?.webContents;
    if (webContents) {
      webContents.stopFindInPage('clearSelection');
    }
  });

  onWindowData("focusUI", (data) => {
    if (data.ui && data.ui.webContents) {
      data.ui.webContents.focus();
    }
  });

  // Settings
  onWindowData("showSettingsMenu", (data) => {
    const settingsView = data.tabManager.createSettingsTab();
    registerSettingsView(data.window.id, data.tabManager, settingsView);
  });

  ipcMain.on("broadcastThemeUpdate", (event) => {
    const windows = WindowManager.getAllWindows();

    for (const winData of windows) {

      if (winData.ui) {
        winData.ui.webContents.send("themeUpdated");
      }

      if (winData.tabManager) {
        const settingsTabs = winData.tabManager.getSettingsTabs ? winData.tabManager.getSettingsTabs() : winData.tabManager.tabs.filter(t => t.isSettingsTab && t.contentView && !t.contentView.webContents.isDestroyed());
        for (const t of settingsTabs) {
          t.contentView.webContents.send("themeUpdated");
        }
      }
    }
  });

  // Theme / bookmark / loading stuff
  ipcMain.handle("saveThemeToFile", (event, themeData) => {
    try {
      fs.writeFileSync(getThemePath(), JSON.stringify(themeData));
      return { success: true };
    } catch (e) {
      console.error("Error saving theme:", e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("loadThemeFromFile", () => {
    try {
      const themePath = getThemePath();
      if (fs.existsSync(themePath)) {
        return JSON.parse(fs.readFileSync(themePath, 'utf-8'));
      }
    } catch (e) {
      console.error("Error loading theme:", e);
    }
    return null;
  });

  ipcMain.handle("getBookmarks", () => bookmarkManager.getAll());

  ipcMain.handle("getSettings", (event) => {
    const tabManager = getTabManager(event);
    return tabManager ? tabManager.getSettingsPayload() : null;
  });

  ipcMain.handle("removeBookmark", (_event, url) => {
    bookmarkManager.remove(url);
    broadcastBookmarks();
    return { success: true };
  });

  ipcMain.handle("updateBookmark", (_event, url, updates) => {
    bookmarkManager.update(url, updates);
    broadcastBookmarks();
    return { success: true };
  });

  ipcMain.handle("getHistory", () => historyManager.getAll());

  ipcMain.handle("deleteHistoryItem", (event, id) => {
    historyManager.remove(id);
    broadcastHistory();
    return { success: true };
  });

  ipcMain.handle("clearHistory", () => {
    historyManager.clear();
    broadcastHistory();
    return { success: true };
  });

  onWindowData("showBookmarkFolderMenu", (data, event, vars) => {
    const { folderName, x, y } = vars;
    const bookmarks = bookmarkManager.getAll().filter(b => b.folder === folderName);
    if (bookmarks.length === 0) return;

    const cmTemplate = bookmarks.map(b => ({
      label: b.title || b.url,
      click: () => {
        const tabManager = data.tabManager;
        const mainTab = tabManager.getMainTab();
        if (!mainTab) return;

        mainTab.isNewTab = false;

        if (mainTab.isSettingsTab) {
          tabManager.navigateTabToRegular(tabManager.currentIndex, b.url);
          return;
        }

        Navigation.search(b.url, mainTab, tabManager.searchEngine);
      }
    }));

    const menu = Menu.buildFromTemplate(cmTemplate);
    menu.popup({
      window: data.window,
      x: Math.round(vars.x),
      y: Math.round(vars.y)
    });
  });

  onWindowData('showContextMenu', (data, event, vars) => {
    const { tabManager, window } = data;
    const selectedIndices = vars.selectedIndices || [];

    let cmTemplate;

    if (selectedIndices.length > 1) {
      cmTemplate = [
        {
          label: `Close Selected Tabs (${selectedIndices.length})`,
          click: () => {
            tabManager.closeTabs(selectedIndices);
          }
        },
        {
          label: `Reload Selected Tabs (${selectedIndices.length})`,
          click: () => {
            selectedIndices.forEach(idx => tabManager.reloadTab(idx));
          }
        },
        { type: 'separator' },
        {
          label: `Hibernate Selected Tabs (${selectedIndices.length})`,
          click: () => {
            tabManager.hibernateTabs(selectedIndices);
          }
        },
        {
          label: `Stack Selected Tabs (${selectedIndices.length})`,
          click: () => {
            tabManager.createStack(selectedIndices);
          }
        }
      ];
    } 
    
    else {
      const targetTab = tabManager.tabs[vars.tabIndex];
      if (!targetTab) return;

      cmTemplate = [
        {
          label: 'Close Tab',
          click: () => {
            tabManager.closeTab(vars.tabIndex);
          }
        },
        {
          label: 'Reload Tab',
          click: () => {
            tabManager.reloadTab(vars.tabIndex);
          }
        },
        { type: 'separator' },
        {
          label: 'Put Tab to Sleep',
          click: () => {
            tabManager.sleep(vars.tabIndex);
          }
        },
        {
          label: targetTab.keepActive ? "Dont Keep Tab Active" : "Keep Tab Active",
          click: () => { tabManager.toggleKeepActive(vars.tabIndex); }
        },
        {
          label: 'Stack Tab',
          click: () => {
            tabManager.createStack([vars.tabIndex]);
          }
        }
      ];
    }

    const menu = Menu.buildFromTemplate(cmTemplate);

    menu.popup({
      window: window,
      x: vars.x,
      y: vars.y
    });
  });

  onWindowData('tabPopOff', (data, event, { tabIndex }) => {
    moveTabToWindow(data, tabIndex);
  });

  onWindowData("tabTransfer", (data, event, { tabIndex, screenX, screenY }) => {
    const targetData = WindowManager.getWindowAtPoint(screenX, screenY, data.window.id);
    moveTabToWindow(data, tabIndex, targetData);
  });

  //EXTENSIONS
  ipcMain.handle('getExtensions', () => {
    return extensionManager.getInstalledExtensions();
  });

  ipcMain.handle('installExtension', async (_event, url) => {
    try {
      const result = await extensionManager.installExtension(url);
      return { success: true, extension: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('removeExtension', async (_event, extensionId) => {
    try {
      await extensionManager.removeExtension(extensionId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });


  let activeExtensionsMenu = null;
  let activeExtensionPopup = null;

  const closeExtensionsMenu = () => {
    if (activeExtensionsMenu && !activeExtensionsMenu.isDestroyed()) {
      activeExtensionsMenu.close();
    }

    activeExtensionsMenu = null;
  };

  const closeExtensionPopup = () => {
    if (activeExtensionPopup && !activeExtensionPopup.isDestroyed()) {
      activeExtensionPopup.close();
    }

    activeExtensionPopup = null;
  };

  ipcMain.on('showExtensionsMenu', (event, bounds) => {
    if (activeExtensionsMenu && !activeExtensionsMenu.isDestroyed()) {
      closeExtensionsMenu();
      return;
    }

    const menuWidth = 300;
    const menuHeight = 400;

    activeExtensionsMenu = new BrowserWindow({
      width: menuWidth,
      height: menuHeight,
      x: Math.round(bounds.x - menuWidth),
      y: Math.round(bounds.y + 4),
      frame: false,
      show: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    const parentData = WindowManager.getManagerBySend(event.sender);

    if (parentData) {
      WindowManager.registerWebContents(activeExtensionsMenu.webContents.id, parentData.window.id);
    }

    activeExtensionsMenu.loadFile(path.join(__dirname, '../extensions/extensionsMenu.html'));

    activeExtensionsMenu.once('ready-to-show', () => {
      if (activeExtensionsMenu && !activeExtensionsMenu.isDestroyed()) {
        const extensions = extensionManager.getInstalledExtensions();


        const extensionsWithIcons = extensions.map(ext => {

          const iconPath = extensionManager.getIconPath ? extensionManager.getIconPath(ext.id) : null;
          return { ...ext, iconPath };

        });

        activeExtensionsMenu.webContents.send('load-extensions', extensionsWithIcons);
        activeExtensionsMenu.show();
      }
    });

    activeExtensionsMenu.on('blur', () => {
      closeExtensionsMenu();
    });

    activeExtensionsMenu.on('closed', () => {
      activeExtensionsMenu = null;
    });
  });

  const createExtensionPopupWindow = (popupUrl, options = {}) => {
    closeExtensionPopup();

    const popupWindow = new BaseWindow({
      width: options.width || 400,
      height: options.height || 500,
      x: options.x,
      y: options.y,
      frame: false,
      show: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      backgroundColor: '#ffffff',
    });

    const popupView = new WebContentsView({
      webPreferences: {
        partition: 'persist:main',
        preload: path.join(__dirname, '../extensions/popupPreload.js')
      }
    });

    popupWindow.contentView.addChildView(popupView);

    const parentWindow = BaseWindow.getFocusedWindow();
    if (parentWindow) {
      WindowManager.registerWebContents(popupView.webContents.id, parentWindow.id);
    }

    const resizeView = () => {
      const bounds = popupWindow.contentView.getBounds();
      popupView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
    };
    resizeView();
    popupWindow.on('resize', resizeView);

    let initialLoadDone = false;
    popupView.webContents.on('will-navigate', (event, url) => {
      if (initialLoadDone) {
        console.log('[EXT POPUP] Blocked self-reload:', url);
        event.preventDefault();
      }
    });

    popupView.webContents.on('will-navigate', (event, url) => {
      if (initialLoadDone) {
        event.preventDefault();
      }
    });

    popupView.webContents.loadURL(popupUrl);

    popupView.webContents.once('did-finish-load', () => {
      initialLoadDone = true;

      if (!popupWindow.isDestroyed()) {
        popupWindow.show();
        popupWindow.focus();

        setTimeout(() => {
          if (!popupWindow.isDestroyed()) {

            popupWindow.on('blur', () => {
              closeExtensionPopup();
            });

          }
        }, 300);
      }
    });

    popupWindow.on('closed', () => {
      activeExtensionPopup = null;
    });

    activeExtensionPopup = popupWindow;
  };

  ipcMain.on('extension-menu-click', (event, extensionId) => {
    const popupUrl = extensionManager.getPopupUrl(extensionId);
    if (!popupUrl) return;

    closeExtensionsMenu();

    setTimeout(() => {
      createExtensionPopupWindow(popupUrl);
    }, 150);
  });

  ipcMain.on('extension-menu-manage', (event) => {
    const data = getWindowData(event);
    closeExtensionsMenu();

    if (data) {
      // Focus the main window
      data.window.focus();

      // Create and show settings tab
      const settingsView = data.tabManager.createSettingsTab();
      registerSettingsView(data.window.id, data.tabManager, settingsView);
    }
  });

  ipcMain.on('openExtensionPopup', (event, extensionId, bounds) => {
    const popupUrl = extensionManager.getPopupUrl(extensionId);
    if (!popupUrl) return;

    createExtensionPopupWindow(popupUrl, {
      x: Math.round(bounds.x - 400 + bounds.width),
      y: Math.round(bounds.y + 10),
    });
  });

  // Downloads IPC
  ipcMain.handle('getDownloads', () => downloadsManager.getDownloads());
  ipcMain.on('pauseDownload', (event, id) => downloadsManager.pauseDownload(id));
  ipcMain.on('resumeDownload', (event, id) => downloadsManager.resumeDownload(id));
  ipcMain.on('cancelDownload', (event, id) => downloadsManager.cancelDownload(id));
  ipcMain.on('removeDownload', (event, id) => downloadsManager.removeDownload(id));
  ipcMain.on('showInFolder', (event, id) => downloadsManager.showInFolder(id));
  ipcMain.on('openDownloadedFile', (event, id) => downloadsManager.openFile(id));
  ipcMain.on('setDownloadsDropdownVisible', (event, visible) => {
    const tabManager = getTabManager(event);
    if (tabManager && tabManager.setDownloadsDropdownVisible) {
      tabManager.setDownloadsDropdownVisible(visible);
    }
  });
}





const userAgentString = (ua) => {
  if (!ua) {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  }
  return ua.replace(/Electron\/[0-9\.]+\s?/g, '')
           .replace(new RegExp(`${app.name || 'simple'}\/[0-9\.]+\s?`, 'ig'), '')
           .trim();
};

const setSessionUserAgent = (ses) => {
  const current = ses.getUserAgent();
  ses.setUserAgent(userAgentString(current));
};

app.whenReady().then(async () => {

  app.userAgentFallback = userAgentString(app.userAgentFallback);
  setSessionUserAgent(session.defaultSession);


  // Changed to help fix bug of logging out of active account sessions when you close a window
  const mainSession = session.fromPartition('persist:main');
  setSessionUserAgent(mainSession);

  // Set up downloads broadcast callback to notify all windows
  downloadsManager.setBroadcastCallback((type, data) => {
    for (const winData of WindowManager.getAllWindows()) {
      if (winData.ui && !winData.ui.webContents.isDestroyed()) {
        winData.ui.webContents.send(type, data);
      }
    }
  });

  const setupDownloadHandler = (ses) => {
    ses.on('will-download', (event, item, webContents) => {
      // Configure default save dialog options synchronously
      item.setSaveDialogOptions({
        defaultPath: item.getFilename()
      });
      
      const downloadId = 'dl_' + require('crypto').randomUUID();
      downloadsManager.registerDownload(downloadId, item);
    });
  };

  setupDownloadHandler(session.defaultSession);
  setupDownloadHandler(mainSession);

  let flushTimer = null;


  mainSession.cookies.on('changed', () => {
    if (flushTimer) clearTimeout(flushTimer);

    flushTimer = setTimeout(() => {

      mainSession.cookies.flushStore().catch(err => {
        console.error('Failed to flush cookie store on change:', err);
      });

    }, 1000);
  });

  ipcSetup();
  registerCookieAndTrackerIPC();

  // Load previously installed extensions before creating windows
  try {
    await extensionManager.loadAllExtensions();
    console.log('Extensions loaded successfully');
  } catch (e) {
    console.error('Failed to load extensions:', e);
  }

  WindowManager.createWindow();



  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) {
      WindowManager.createWindow();
    }
  });
});

app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  try {
    for (const data of WindowManager.getAllWindows()) {
      if (data.tabManager && typeof data.tabManager.flushConfigSave === 'function') {
        data.tabManager.flushConfigSave();
      }
    }
  } catch (err) {
    console.error('Failed to flush configuration on will-quit:', err);
  }

  try {
    await session.fromPartition('persist:main').cookies.flushStore();
  }

  catch (err) {
    console.error('Failed to flush cookie store on will-quit:', err);
  }
});
