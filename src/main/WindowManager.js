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
            backgroundColor: '#00000000',
            backgroundMaterial: 'acrylic',
            vibrancy: 'fullscreen-ui',
            titleBarStyle: 'hidden',
            titleBarOverlay: {  
                color: '#00000000',
                symbolColor: '#ffffff', 
            }
        });

        const ui = new WebContentsView({
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
            }
        });
        ui.setBackgroundColor('#00000000');

        mainWindow.contentView.addChildView(ui);
        ui.webContents.loadFile(path.join(__dirname, '../index.html'));



        const tabManager = new TabManager(mainWindow, ui, curTab != null);
        const windowId = mainWindow.id;
        const windowData = { window: mainWindow, ui, tabManager };



        
        this.windows.set(windowId, windowData);
        this.webContentsIds.set(ui.webContents.id, windowId);



        ui.webContents.on('did-finish-load', () => {
            tabManager.sendTabData();
        });

        const handleResize = () => {
             WindowResizing.resize(mainWindow, ui, tabManager, tabManager.stackBarVisible);
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
        
        else if (tabManager.tabs.length == 0) {
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
    
    registerWebContents(webContentsId, windowId) {
      this.webContentsIds.set(webContentsId, windowId);
    }

    unregisterWebContents(webContentsId) {
       this.webContentsIds.delete(webContentsId);
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

          // Picture-in-Picture: Alt+P
          globalShortcut.register("Alt+P", () => {
            const mainTab = tabManager.getMainTab();
            if (mainTab && mainTab.contentView && mainTab.contentView.webContents) {
              mainTab.contentView.webContents.executeJavaScript(`
                (async () => {
                  // If already in PiP, exit
                  if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                    return 'exited';
                  }
                  // Find videos on the page
                  const videos = Array.from(document.querySelectorAll('video'));
                  if (videos.length === 0) return 'no-video';
                  // Prefer a playing video, then the largest one
                  const playing = videos.filter(v => !v.paused && !v.ended);
                  const target = playing.length > 0
                    ? playing.reduce((a, b) => (a.videoWidth * a.videoHeight) >= (b.videoWidth * b.videoHeight) ? a : b)
                    : videos.reduce((a, b) => (a.videoWidth * a.videoHeight) >= (b.videoWidth * b.videoHeight) ? a : b);
                  await target.requestPictureInPicture();
                  return 'pip';
                })()
              `).catch(() => {});
            }
          });
        
        globalShortcut.register("CommandOrControl+N", () => {
            this.createWindow();
        });
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }

    getWindowAtPoint(screenX, screenY, excludeWindowId = null) {
      for (const [windowId, data] of this.windows) {
          if (windowId === excludeWindowId) continue;

          const bounds = data.window.getBounds();

          if (screenX >= bounds.x &&screenX < bounds.x + bounds.width &&
              screenY >= bounds.y && screenY < bounds.y + bounds.height) {
              return data;
          }
          
      }

      return null;
    }
}

module.exports = new WindowManager();
