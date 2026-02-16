const { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu, session  } = require('electron');
const path = require('node:path');
const WindowResizing = require("./WindowResizing")
const TabManager = require('../tabs/TabManager');
const Navigation = require('../addressBar/Navigation');
const SettingsManager = require('../settings/SettingsManager');
// const TabManager = require("./")



let mainWindow = null;
let ui = null;
let tabManager = null;



// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}



const createWindow = () => {
  // Create the browser window.
  mainWindow = new BaseWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    backgroundColor: '#020617',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#020617',
      symbolColor: '#ffffff',
      height: 30
    }

  });



  ui = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  mainWindow.contentView.addChildView(ui);
  ui.webContents.loadFile(path.join(__dirname, '../index.html'));

  tabManager = new TabManager(mainWindow, ui);

  WindowResizing.init(mainWindow, ui, tabManager);

  // EVENT LISTENERS
  ui.webContents.on('did-finish-load', () => {
    tabManager.sendTabData();
  });

  mainWindow.on('resize', () => {
    WindowResizing.resize();
  });

  mainWindow.on('enter-full-screen', () => {
    WindowResizing.resize();
  });

  mainWindow.on('leave-full-screen', () => {
    WindowResizing.resize();
  });

  session.defaultSession.on('will-download', (event, item, webContents) => {
    console.log("Trying to download");
  
    const downloadsPath = app.getPath('downloads');
    const newPath = path.join(downloadsPath, item.getFilename());

    item.setSavePath(filePath);
  });


  // REST OF SETUP
  keybindSetup();
  
  ipcSetup();
  tabManager.createTab();
};



const ipcSetup = () => {


  ipcMain.on("createTab", () => tabManager.createTab());
  ipcMain.on("switchTab", (event, tabID) => tabManager.switchTab(tabID));
  ipcMain.on("reorderTabs", (event, start, end) => tabManager.reorderTabs(start, end));
  ipcMain.on("closeTab", (event, tabID) => tabManager.closeTab(tabID));
  ipcMain.on("hibernateTab", (event, tabID) => tabManager.sleep(tabID));
  ipcMain.on("updateDefaultSite", (event, site) => tabManager.updateDefaultSite(site));


  // Navigation
  ipcMain.on("search", (event, address) => {
    Navigation.search(address, tabManager.getMainTab());
  });

  ipcMain.on("tBAction", (event, action) => {
    Navigation.toolbarAction(action, tabManager.getMainTab());
  });


      // in page
      
  ipcMain.on("searchInPage", (event, phrase, options) => {

    const mainTab = tabManager.getMainTab();
    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {

      if (phrase) {
  
        mainTab.contentView.webContents.findInPage(phrase, options || {});
    }
    
      else {
        mainTab.contentView.webContents.stopFindInPage('clearSelection');
      }
    }
  });

  ipcMain.on("stopFindInPage", () => {
  
    const mainTab = tabManager.getMainTab();
    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {
      mainTab.contentView.webContents.stopFindInPage('clearSelection');
    }
  });

   ipcMain.on("focusUI", () => {
    if (ui && ui.webContents) {
        ui.webContents.focus();
    }
  });

  // Settings
  ipcMain.on("showSettingsMenu", () => {
    const settingsView = SettingsManager.openSettingsMenu(mainWindow);
    tabManager.setSettingsUI(settingsView);

    settingsView.webContents.once('did-finish-load', () => {
      tabManager.sendTabData();
    });
  });

  ipcMain.on('showContextMenu', (event, vars) => {

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
      window: mainWindow,
      x: vars.x,
      y: vars.y
    });
  });
}

const keybindSetup = () => {
 
  mainWindow.on("focus", () => {
     //TABS
  globalShortcut.register('CommandOrControl+T', () => {
    // console.log("attempt");
    tabManager.createTab();
    //console.log(tabs);
  })

  globalShortcut.register('Shift+Control+1', () => { tabManager.switchTab(0); })
  globalShortcut.register('Shift+Control+2', () => { tabManager.switchTab(1); })
  globalShortcut.register('Shift+Control+3', () => { tabManager.switchTab(2); })


  globalShortcut.register("Control+W", () => {
    if (tabManager.closeLastOpened) {
      tabManager.closeLastOpened();
    }

    else {
      tabManager.closeTab(tabManager.currentIndex);
    }
  });



  // OTHER STUFF
  globalShortcut.register("Control+W", () => {
    if (tabManager.closeLastOpened) {
      tabManager.closeLastOpened();
    }

    else {
      tabManager.closeTab(tabManager.currentIndex);
    }
  });

  globalShortcut.register("Control+Shift+I", () => {
    const mainTab = tabManager.getMainTab();
    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {
      mainTab.contentView.webContents.toggleDevTools();
    }
  })


  globalShortcut.register("Control+O", () => { })




  globalShortcut.register('CommandOrControl+=', () => {
    const mainTab = tabManager.getMainTab();

    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {
      mainTab.contentView.webContents.setZoomLevel(
        mainTab.contentView.webContents.getZoomLevel() + 0.5
      );

    }
  });


  globalShortcut.register('CommandOrControl+-', () => {
    const mainTab = tabManager.getMainTab();

    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {
      mainTab.contentView.webContents.setZoomLevel(
        mainTab.contentView.webContents.getZoomLevel() - 0.5
      );
    }

  });


  globalShortcut.register('CommandOrControl+0', () => {
    const mainTab = tabManager.getMainTab();

    if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {
      mainTab.contentView.webContents.setZoomLevel(0);
    }

  });

  globalShortcut.register("CommandOrControl+F", () => {
    ui.webContents.focus(); 
    ui.webContents.send("toggleFindBar");
  })
  })

  mainWindow.on("blur", () => {
    globalShortcut.unregisterAll();
  })





}


app.whenReady().then(() => {

  createWindow();
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {

  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
