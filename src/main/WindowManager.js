const { BaseWindow, WebContentsView, app, globalShortcut, ipcMain } = require('electron');
const path = require('node:path');
const WindowResizing = require("./WindowResizing");
const TabManager = require('../tabs/TabManager');

class WindowManager {
    constructor() {
        this.windows = new Map(); 
        this.webContentsIds = new Map(); 
    }

    createWindow(curTab = null) {
        const mainWindow = new BaseWindow({
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

        const ui = new WebContentsView({
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
            }
        });

        mainWindow.contentView.addChildView(ui);
        ui.webContents.loadFile(path.join(__dirname, '../index.html'));



        const tabManager = new TabManager(mainWindow, ui);
        const windowId = mainWindow.id;
        const windowData = { window: mainWindow, ui, tabManager };



        
        this.windows.set(windowId, windowData);
        this.webContentsIds.set(ui.webContents.id, windowId);



        ui.webContents.on('did-finish-load', () => {
            tabManager.sendTabData();
        });

        const handleResize = () => {
             WindowResizing.resize(mainWindow, ui, tabManager);
        };

        mainWindow.on('resize', handleResize);
        mainWindow.on('enter-full-screen', handleResize);
        mainWindow.on('leave-full-screen', handleResize);
        
        mainWindow.on('focus', () => {
            this.registerShortcuts(windowId);
        });

        mainWindow.on('blur', () => {
            globalShortcut.unregisterAll();
        });

        mainWindow.on('closed', () => {
            this.windows.delete(windowId);
            this.webContentsIds.delete(ui.webContents.id);
        });

        if (curTab) {
            tabManager.stickTab(curTab);
        } 
        
        else {
            tabManager.createTab();
        }

        return windowData;
    }

    getManagerBySend(webContents) {
        const id = this.webContentsIds.get(webContents.id);


        if (id) {
            return this.windows.get(id);
        }

        return null;
    }
    
    registerShortcuts(windowId) {
        const data = this.windows.get(windowId);
        if (!data) return;
        const { tabManager, ui } = data; 

        globalShortcut.unregisterAll(); 

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
          
        
        globalShortcut.register("CommandOrControl+N", () => {
            this.createWindow();
        });
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }
}

module.exports = new WindowManager();
