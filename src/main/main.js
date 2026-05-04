const { app, BaseWindow, BrowserWindow, WebContentsView, globalShortcut, ipcMain, Menu, session } = require('electron');
const path = require('node:path');

const Navigation = require('../addressBar/Navigation');
const WindowManager = require('./WindowManager');
const { registerCookieAndTrackerIPC } = require('./cookiesAndTrackers');
const extensionManager = require('../extensions/extensionManager');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const registerSettingsView = (windowId, tabManager, settingsView) => {
  if (!settingsView?.webContents) return;

  WindowManager.registerWebContents(settingsView.webContents.id, windowId);
  settingsView.webContents.on('destroyed', () => {
    WindowManager.unregisterWebContents(settingsView.webContents.id);
  });
  settingsView.webContents.once('did-finish-load', () => {
    settingsView.webContents.send("initSettings", {
      defaultSite: tabManager.defaultSite,
      searchEngine: tabManager.searchEngine,
    });
    tabManager.sendTabData();
  });
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

  onTabManager("createTab", (tabManager) => tabManager.createTab());
  onTabManager("switchTab", (tabManager, event, tabId) => tabManager.switchTab(tabId));
  onTabManager("reorderTabs", (tabManager, event, start, end) => tabManager.reorderTabs(start, end));
  onTabManager("closeTab", (tabManager, event, tabId) => tabManager.closeTab(tabId));
  onTabManager("hibernateTab", (tabManager, event, tabId) => tabManager.sleep(tabId));
  onTabManager("updateDefaultSite", (tabManager, event, site) => tabManager.updateDefaultSite(site));
  onTabManager("updateSearchEngine", (tabManager, event, engine) => tabManager.updateSearchEngine(engine));
  
  // Tab stacking
  onTabManager("createStack", (tabManager, event, tabIndices) => tabManager.createStack(tabIndices));
  onTabManager("updateStack", (tabManager, event, stackId, tabIndex) => tabManager.updateStack(stackId, tabIndex));
  onTabManager("deleteStack", (tabManager, event, stackId) => tabManager.deleteStack(stackId));
  onTabManager("closeStack", (tabManager, event, stackId) => tabManager.closeStack(stackId));
  onTabManager("removeFromStack", (tabManager, event, tabIndex) => tabManager.removeFromStack(tabIndex));
  onTabManager("renameStack", (tabManager, event, stackId, name) => tabManager.renameStack(stackId, name));
  onTabManager("reorderStack", (tabManager, event, stackId, toIndex) => tabManager.reorderStack(stackId, toIndex));

  onWindowData("stackBarVisible", (data, event, visible) => {
    
    data.tabManager.setStackBarVisible(visible);
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
        }
      }
    ];

    const menu = Menu.buildFromTemplate(cmTemplate);
    menu.popup({
      window: window,
      x: vars.x,
      y: vars.y
    });
  });


  // Navigation
  ipcMain.on("search", (event, address) => {
    const tabManager = getTabManager(event);
    const data = getWindowData(event);
    if (!tabManager || !data) return;

    const trimmedAddress = address.trim();
    const mainTab = tabManager.getMainTab();
    if (!mainTab) return;

    if (trimmedAddress.toLowerCase() === "about://settings") {
        const settingsView = tabManager.navigateTabToSettings(tabManager.currentIndex); 
        
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
        Navigation.toolbarAction(action, mainTab);
    }
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

  onWindowData('showContextMenu', (data, event, vars) => {
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
          tabManager.reloadTab(vars.tabIndex);
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
}






app.whenReady().then(async () => {

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

  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
