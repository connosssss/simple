import { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu } from 'electron';
import path from 'node:path';

let tabs: WebContentsView[] = []
let tabsh = {};
let mainWindow: BaseWindow | null = null;
let mainTab: WebContentsView | null = null;
let ui: WebContentsView | null = null;
let currentIndex = -1;

// Keybind relevant
let lastOpenedTabs: WebContentsView[] = []



interface Tab {
  contentView: WebContentsView;
  title: String;
  address: String;
  isActive: Boolean;
  isStacked: Boolean;
  stackIndex: Number;
}


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BaseWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true

  });



  ui = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });



  mainWindow.contentView.addChildView(ui);
  ui.webContents.loadFile(path.join(__dirname, 'index.html'));
  //ui.webContents.openDevTools();


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
};

const resize = () => {
  if (!mainWindow) return;
  
  let bounds = mainWindow.contentView.getBounds()
  const isFullscreen = mainWindow.isFullScreen();

  if (isFullscreen) {
    ui?.setBounds({ x: 0, y: 0, width: bounds.width, height: 0 })
  

  if (mainTab) {
    mainTab.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height 
    });
  }
  }

  else{
    ui?.setBounds({ x: 0, y: 0, width: bounds.width, height: 30 })
  

  if (mainTab) {
    mainTab.setBounds({
      x: 0,
      y: 30,
      width: bounds.width,
      height: bounds.height - 30
    });
  }
  }
  
}

const createTab = () => {
  let newTab = new WebContentsView();

  tabs.push(newTab);
  newTab.webContents.loadURL('https://google.com');

  newTab.webContents.on('page-title-updated', () => {
    sendTabData();
  });

  

  mainTab = newTab;
  switchTab(tabs.length - 1);
  lastOpenedTabs.push(mainTab);
  

  
  resize();

}

const switchTab = (tabID: number) => {
  if (!mainWindow) return;
  
  if (tabID < tabs.length) {

    if (mainTab) {
      mainWindow.contentView.removeChildView(mainTab)
    }

    mainTab = tabs[tabID];
    mainWindow.contentView.addChildView(mainTab);
    currentIndex = tabID

    resize();
    sendTabData();

  }
}

const closeTab = (tabID: number) => {
  if (!mainWindow) return;
  
  // HARD LOCKS USERS INTO ALWAYS HAVING AT LEAST A SINGLE TAB OPEN
  if (tabID < tabs.length && tabs.length > 1) {
    let tabToClose = tabs[tabID];

    tabs.splice(tabID, 1);
    mainWindow.contentView.removeChildView(tabToClose);
    tabToClose.webContents.close();

    if (tabID === currentIndex) {

      if (tabs.length > 0) {
        switchTab(0);
      }

      else {
        mainTab = null;
        currentIndex = -1;
      }
    }





    sendTabData();
  }
  else if (tabs.length == 1){
    app.quit()
  }

}

const sendTabData = () => {
  const tabData = tabs.map((tab, index) => ({
    index: index,
    isActive: index === currentIndex,
    title: tab.webContents.getTitle()
  }));


  ui?.webContents.send("updateTabs", tabData)
  console.log("tab data sent");
}

const reorderTabs = (fromIndex: number, toIndex: number) => {
  if (fromIndex < 0 || fromIndex >= tabs.length || toIndex < 0 || toIndex >= tabs.length) return;

  const tabToMove = tabs[fromIndex];
  tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, tabToMove);

  if (mainTab) {
    currentIndex = tabs.indexOf(mainTab);
  }

  sendTabData();
}

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
    closeTab(tabs.indexOf(lastOpenedTabs.pop()!));

  })
  
  
  
  // OTHER STUFF
  globalShortcut.register("Control+Shift+I", () => {
    if (mainTab && mainTab.webContents) {
      mainTab.webContents.toggleDevTools();
    }
  })







  /// IPC SETUP + OTHER 

  ipcMain.on("createTab", createTab)
  ipcMain.on("switchTab", (event, tabID) => switchTab(tabID));
  ipcMain.on("reorderTabs", (event, startingIndex, endingIndex) => reorderTabs(startingIndex, endingIndex));
  ipcMain.on("closeTab", (event, tabID) => closeTab(tabID));
}






// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.


app.whenReady().then(() => {

  createWindow();
  // tabs not displaying correctly on load 
  createTab();



  keybindSetup();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // MAY NEED TO FIX THIS PART !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!:p!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.