const { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu   } = require('electron');
const { create } = require('node:domain');
const path = require('node:path');



let tabs = []
let mainWindow = null;
let mainTab = null;
let ui = null;
let currentIndex = -1;




// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BaseWindow({
    width: 800,
    height: 600,
    
  });
  


  ui = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  
  
  mainWindow.contentView.addChildView(ui);
  ui.webContents.loadFile(path.join(__dirname, 'index.html'));
  //ui.webContents.openDevTools();

  



  mainWindow.on('resize', () => {
    resize();
  });
};

const resize = () => {
    let bounds = mainWindow.contentView.getBounds()


    ui.setBounds({x:0, y: 0, width: bounds.width, height: 50})
    
    
    if (mainTab) {
      mainTab.setBounds({ 
        x: 0, 
        y: 40, 
        width: bounds.width, 
        height: bounds.height - 40 
      });
    }
  }

const createTab = () => {
  let newTab = new WebContentsView();
  
  tabs.push(newTab);
  newTab.webContents.loadURL('https://google.com');
  
  mainTab = newTab;
  switchTab(tabs.length - 1);

  resize();

}

const switchTab = (tabID) => {
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

const sendTabData = () => {
  const tabData = tabs.map((tab, index) => ({
    index: index,
    isActive: index === currentIndex,
    title: tab.webContents.getTitle()
  }));
  

  ui.webContents.send("updateTabs", tabData)
  console.log("tab data sent");
}

const keybindSetup = () => {
  globalShortcut.register('CommandOrControl+T', () => {
    console.log("attempt");
    createTab();
    console.log(tabs);
  })

  globalShortcut.register('Shift+Control+1', () => {switchTab(0);})
  globalShortcut.register('Shift+Control+2', () => {switchTab(1);})
  globalShortcut.register('Shift+Control+3', () => {switchTab(2);}) 











  /// IPC SETUP + OTHER 

  ipcMain.on("createTab", createTab)
  ipcMain.on("switchTab", (event, tabID) => switchTab(tabID));
  
  
  
  
  mainTab?.webContents.on('page-title-updated', () => {
    sendTabData();
  });
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
