const { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu, NavigaitonHistory } = require('electron');
const { create } = require('node:domain');
const path = require('node:path');



let tabs = []
let tabsh = {};
let mainWindow = null;
let mainTab = null;
let ui = null;
let settingsUI = null;
let currentIndex = -1;

// Keybind relevant
let lastOpenedTabs = []









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
  let bounds = mainWindow.contentView.getBounds()
  const isFullscreen = mainWindow.isFullScreen();

  if (isFullscreen) {
    ui.setBounds({ x: 0, y: 0, width: bounds.width, height: 0 })
  

  if (mainTab) {
    mainTab.contentView.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height 
    });
  }
  }

  else{
    ui.setBounds({ x: 0, y: 0, width: bounds.width, height: 100 })
  

  if (mainTab) {
    mainTab.contentView.setBounds({
      x: 0,
      y: 100 ,
      width: bounds.width,
      height: bounds.height - 100
    });
  }
  }
  
}

const createTab = () => {
  let newTab = {
    contentView: new WebContentsView(),
    address: "",
    title: "",
    isActive: true,
    isStacked: false, 
    stackInd: -1,
    lastActiveAt: Date.now()
  }


  tabs.push(newTab);
  newTab.contentView.webContents.loadURL('https://google.com');


  newTab.contentView.webContents.on('page-title-updated', () => {
    newTab.title = newTab.contentView.webContents.getTitle();
    newTab.address = newTab.contentView.webContents.getURL();
    
    sendTabData();
  });

  

  mainTab = newTab;
  switchTab(tabs.length - 1);
  lastOpenedTabs.push(mainTab);
  

  
  resize();

}

const switchTab = (tabID) => {
  if (tabID < tabs.length) {

    if(tabs[tabID].contentView == null){
      wake(tabID)
    }

    if (mainTab) {
      mainWindow.contentView.removeChildView(mainTab.contentView)
    }

    mainTab = tabs[tabID];
    mainTab.lastActiveAt = Date.now(); 
    mainWindow.contentView.addChildView(mainTab.contentView);
    currentIndex = tabID;

    resize();
    sendTabData();

  }
}

const closeTab = (tabID) => {
  // HARD LOCKS USERS INTO ALWAYS HAVING AT LEAST A SINGLE TAB OPEN
  if (tabID < tabs.length && tabs.length > 1) {
    let tabToClose = tabs[tabID];

    tabs.splice(tabID, 1);

    if(tabToClose.contentView){
      mainWindow.contentView.removeChildView(tabToClose.contentView);
      tabToClose.contentView.webContents.close();
    }

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

const sleep = (index) => {
  const tab = tabs[index];

  if(!tab.isActive) return;

  tab.isActive = false;
   sendTabData();

  if(index == currentIndex){
    if(index == 0 ){

      if (tabs.length == 0){
        closeTab(0);
      }
      else{
        switchTab(1);
      }


    }
    else{
      switchTab(0);
    }

  }


  if (tab.contentView.webContents && !tab.contentView.webContents.isDestroyed()) {
    tab.contentView.webContents.close();
  }

  tab.contentView = null;

  sendTabData();

  resize();
}



const wake = (index) => {
  tab = tabs[index];
  tab.contentView = new WebContentsView();

  tab.contentView.webContents.loadURL(tab.address);
  tab.isActive = true;



}


setTimeout(() => {
 sendTabData();
}, 2000);



const sendTabData = () => {
  const tabData = tabs.map((tab, index) => ({
    index: index,
    isMainTab: index === currentIndex,
    title: tab.title || "",
    address: tab.address,
    isStacked: tab.isStacked,
    stackInd: tab.stackInd,
    
    isActive: tab.isActive,
    lastActiveAt: tab.lastActiveAt,

  }));


  ui.webContents.send("updateTabs", tabData)

  if (settingsUI && !settingsUI.webContents.isDestroyed()) {
    settingsUI.webContents.send("updateTabs", tabData);
  }

  console.log("tab data sent");
}

const reorderTabs = (fromIndex, toIndex) => {
  if (fromIndex < 0 || fromIndex >= tabs.length || toIndex < 0 || toIndex >= tabs.length) return;

  const tabToMove = tabs[fromIndex];
  tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, tabToMove);

  if (mainTab) {
    currentIndex = tabs.indexOf(mainTab);
  }

  sendTabData();
}



const openSettingsMenu = () => {
  const settingsWindow = new BaseWindow({
      width: 600,
      height: 500,
      parent: mainWindow,
      modal: false,
      autoHideMenuBar: true,
      backgroundColor: '#020617',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });


    settingsUI = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      }
    });



  settingsWindow.contentView.addChildView(settingsUI);
  settingsUI.webContents.loadFile(path.join(__dirname, 'settings.html'));

    settingsUI.webContents.on('did-finish-load', () => {
      sendTabData();
    });

    settingsWindow.on('resize', () => {
      let bounds = settingsWindow.contentView.getBounds();
      settingsUI.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
    });

    let bounds = settingsWindow.contentView.getBounds();
    settingsUI.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
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

  ipcMain.on("createTab", createTab)
  ipcMain.on("switchTab", (event, tabID) => switchTab(tabID));
  ipcMain.on("reorderTabs", (event, startingIndex, endingIndex) => reorderTabs(startingIndex, endingIndex));
  ipcMain.on("closeTab", (event, tabID) => closeTab(tabID));

  ipcMain.on("search", (event, address) => search(address));
  ipcMain.on("tBAction", (event, action) => toolbarAction(action));


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













const search = (address) => {
  

  const urlPattern = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;

  let temp = address;
  
  if(!address.startsWith("https://") && !address.startsWith("http://")){
    temp = "https://" + address
  }
  console.log("temp: " + temp + "\n address: " + address + " \n test: " + !!urlPattern.test(temp))

  let valid = false;
  
  try{
    const url = new URL(temp)
    valid = url.hostname.includes(".") || url.hostname == "localhost";
  }
  catch (error) {
    valid = false;
  }

  if(valid){
      mainTab.contentView.webContents.loadURL(temp)
  }
  
  else{
    mainTab.contentView.webContents.loadURL("https://www.google.com/search?q=" + address)
  }
  //sendTabData();





}


const toolbarAction = (input) => {
 
    if(mainTab.contentView.webContents.navigationHistory.canGoBack() && input == "back"){
      mainTab.contentView.webContents.navigationHistory.goBack();
    }

    if(input == "forward" && mainTab.contentView.webContents.navigationHistory.canGoForward()){
      mainTab.contentView.webContents.navigationHistory.goForward();
    }

    if (input == "refresh"){
      mainTab.contentView.webContents.reload();
    }

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
