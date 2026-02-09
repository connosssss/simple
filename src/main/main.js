const { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu } = require('electron');
const path = require('node:path');
const WindowResizing = require("./WindowResizing")
const TabManager = require('../tabs/TabManager');
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
    ui.webContents.loadFile(path.join(__dirname, 'index.html'));
    
    tabManager = new TabManager(mainWindow, ui);

    WindowResizing.init(mainWindow, ui, tabManager);
  
  // EVENT LISTENERS
    ui.webContents.on('did-finish-load', () => {
      sendTabData();
    });

    mainWindow.on('resize', () => {
        resize();
    });

  mainWindow.on('enter-full-screen', () => {
        resize();
    });
  
  mainWindow.on('leave-full-screen', () => {
        resize();
  });


  // REST OF SETUP
  keybindSetup();


};



const keybindSetup = () => {
  //TABS
  globalShortcut.register('CommandOrControl+T', () => {
   // console.log("attempt");
    createTab();
    //console.log(tabs);
  })

  globalShortcut.register('Shift+Control+1', () => { switchTab(0); })
  globalShortcut.register('Shift+Control+2', () => { switchTab(1); })
  globalShortcut.register('Shift+Control+3', () => { switchTab(2); })


  globalShortcut.register("Control+W", () => {
    closeTab(tabs.indexOf(lastOpenedTabs.pop()));

  })
  
  
  
  // OTHER STUFF
  globalShortcut.register("Control+Shift+I", () => {
    if (mainTab && mainTab.contentView.webContents) {
      mainTab.contentView.webContents.toggleDevTools();
    }
  })
  globalShortcut.register("Control+O", () => {})







  /// IPC SETUP + OTHER 

  ipcMain.on("createTab", () => tabManager.createTab());
  ipcMain.on("switchTab", (event, tabID) => tabManager.switchTab(tabID));
  ipcMain.on("reorderTabs", (event, start, end) => tabManager.reorderTabs(start, end));
  ipcMain.on("closeTab", (event, tabID) => tabManager.closeTab(tabID));
  ipcMain.on("hibernateTab", (event, tabID) => tabManager.sleep(tabID));


  ipcMain.on('showContextMenu', (event, vars) => {

    
    
    const cmTemplate = [
      {
        label: 'Close Tab',
        click: () => {
         
          closeTab(vars.tabIndex);
          
        }
      },
      
      {
        label: 'Reload Tab',
        click: () => {
          if (vars.tabIndex !== undefined && tabs[vars.tabIndex]) {
            tabs[vars.tabIndex].contentView.webContents.reload();
          }
        }
      },
      { type: 'separator' },
      {

        label: 'Put Tab to Sleep',
        
        click: () => {
          sleep(vars.tabIndex)
        }
      },
      {

        label: tabs[vars.tabIndex].keepActive ? "Dont Keep Tab Active": "Keep Tab Active",
        
        click: () => {
          changeKeepActive(vars.tabIndex)
        }
      },

    ];

    const menu = Menu.buildFromTemplate(cmTemplate);

    menu.popup({
      window: mainWindow,
      x: vars.x,
      y: vars.y
    });
  });


  ipcMain.on("showSettingsMenu", () => {
    openSettingsMenu();
  });

  ipcMain.on("hibernateTab", (event, tabIndex) => {
    sleep(tabIndex);
  });


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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});