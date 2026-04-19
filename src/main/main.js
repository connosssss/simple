const { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu, session  } = require('electron');
const path = require('node:path');
const WindowResizing = require("./WindowResizing")
const TabManager = require('../tabs/TabManager');
const Navigation = require('../addressBar/Navigation');
const SettingsManager = require('../settings/SettingsManager');
const WindowManager = require('./WindowManager');
const { setupTrackerBlocking, registerCookieAndTrackerIPC } = require('./cookiesAndTrackers');
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

  ipcMain.on("updateSearchEngine", (event, engine) => {
      const tm = getTabManager(event);
      if (tm) tm.updateSearchEngine(engine);
  });
  

  // Tab stacking
  ipcMain.on("createStack", (event, tabIndices) => {
      const tm = getTabManager(event);
      if (tm) tm.createStack(tabIndices);
  });

  ipcMain.on("updateStack", (event, stackId, tabIndex) => {
      const tm = getTabManager(event);
      if (tm) tm.updateStack(stackId, tabIndex);
  });

  ipcMain.on("deleteStack", (event, stackId) => {
      const tm = getTabManager(event);
      if (tm) tm.deleteStack(stackId);
  });

  ipcMain.on("removeFromStack", (event, tabIndex) => {
      const tm = getTabManager(event);
      if (tm) tm.removeFromStack(tabIndex);
  });

  ipcMain.on("renameStack", (event, stackId, name) => {
      const tm = getTabManager(event);
      if (tm) tm.renameStack(stackId, name);
  });

  ipcMain.on("showStackContextMenu", (event, vars) => {
  const data = getManager(event);
    if (!data) return;
    const { tabManager, window: win } = data;


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
      window: win,
      x: vars.x,
      y: vars.y
    });
  });


  // Navigation
  ipcMain.on("search", (event, address) => {
    const tm = getTabManager(event);
    if (tm) Navigation.search(address, tm.getMainTab(), tm.searchEngine);
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



}






app.whenReady().then(() => {

  ipcSetup();
  registerCookieAndTrackerIPC();
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
