const { BaseWindow, WebContentsView, app, Menu, ipcMain, session } = require('electron');
const path = require('node:path');
const WindowResizing = require("./WindowResizing");
const TabManager = require('../tabs/TabManager');

class WindowManager {
    constructor() {
        this.windows = new Map();
        this.webContentsIds = new Map();
    }

    createWindow(curTab = null) {
        if (!this.menuSet) {
            this.setupApplicationMenu();
            this.menuSet = true;
        }

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

        const tabManager = new TabManager(mainWindow, ui, curTab != null);
        const windowId = mainWindow.id;
        const windowData = { window: mainWindow, ui, tabManager };

        this.windows.set(windowId, windowData);
        this.webContentsIds.set(ui.webContents.id, windowId);

        ui.webContents.loadFile(path.join(__dirname, '../index.html'));



        ui.webContents.on('did-finish-load', () => {
            tabManager.sendTabData();
        });

        const handleResize = () => {
            WindowResizing.resize(mainWindow, ui, tabManager, tabManager.stackBarVisible);
        };

        mainWindow.on('resize', handleResize);
        mainWindow.on('enter-full-screen', handleResize);
        mainWindow.on('leave-full-screen', handleResize);


        mainWindow.on('closed', () => {
            this.windows.delete(windowId);
            this.webContentsIds.delete(ui.webContents.id);
            // Flush the persistent cookie store immediately on window close
            session.fromPartition('persist:main').cookies.flushStore().catch(err => {
                console.error("Failed to flush cookie store on window close:", err);
            });
        });

        if (curTab) {
            tabManager.stickTab(curTab);
        }

        else if (tabManager.tabs.length == 0) {
            tabManager.createTab();
        }

        this.startWindowControlsHoverTracking(mainWindow, tabManager);

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

    registerSettingsView(windowId, tabManager, settingsView) {
        if (!settingsView?.webContents) return;

        this.registerWebContents(settingsView.webContents.id, windowId);
        settingsView.webContents.on('destroyed', () => {
            this.unregisterWebContents(settingsView.webContents.id);
        });

        settingsView.webContents.once('did-finish-load', () => {
            settingsView.webContents.send("initSettings", tabManager.getSettingsPayload());
            try {
                const historyManager = require('../history/history');
                settingsView.webContents.send("updateHistory", historyManager.getAll());
            } catch (err) {
                console.error("Error sending initial history:", err);
            }
            tabManager.sendTabData();
        });
    }


    getActiveWindowData(browserWindow) {
        const win = browserWindow || BaseWindow.getFocusedWindow();
        return win ? this.windows.get(win.id) : null;
    }

    setupApplicationMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New Tab',
                        accelerator: 'CmdOrCtrl+T',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) data.tabManager.createTab();
                        }
                    },
                    {
                        label: 'New Window',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            this.createWindow();
                        }
                    },
                    {
                        label: 'Close Tab',
                        accelerator: 'CmdOrCtrl+W',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) {
                                const { tabManager } = data;
                                if (tabManager.closeLastOpened) {
                                    tabManager.closeLastOpened();
                                } else {
                                    tabManager.closeTab(tabManager.currentIndex);
                                }
                            }
                        }
                    },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Toggle Developer Tools',
                        accelerator: 'CmdOrCtrl+Shift+I',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) data.tabManager.toggleDevTools();
                        }
                    },
                    {
                        label: 'Find in Page',
                        accelerator: 'CmdOrCtrl+F',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) {
                                data.ui.webContents.focus();
                                data.ui.webContents.send("toggleFindBar");
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Zoom In',
                        accelerator: 'CmdOrCtrl+=',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) data.tabManager.zoomIn();
                        }
                    },
                    {
                        label: 'Zoom Out',
                        accelerator: 'CmdOrCtrl+-',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) data.tabManager.zoomOut();
                        }
                    },
                    {
                        label: 'Reset Zoom',
                        accelerator: 'CmdOrCtrl+0',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) data.tabManager.resetZoom();
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Picture in Picture',
                        accelerator: 'Alt+P',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) {
                                const mainTab = data.tabManager.getMainTab();
                                if (mainTab) {
                                    data.tabManager.togglePictureInPicture(mainTab);
                                }
                            }
                        }
                    },
                    {
                        label: 'History',
                        accelerator: 'CmdOrCtrl+H',
                        click: (menuItem, browserWindow) => {
                            const data = this.getActiveWindowData(browserWindow);
                            if (data) {
                                const newTab = data.tabManager.createTab("about://history");
                                if (newTab && newTab.isSettingsTab && newTab.contentView) {
                                    this.registerSettingsView(data.window.id, data.tabManager, newTab.contentView);
                                }
                            }
                        }
                    }
                ]
            },
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    startWindowControlsHoverTracking(mainWindow, tabManager) {
        const { screen } = require('electron');
        let isHovered = false;

        const intervalId = setInterval(() => {
            if (mainWindow.isDestroyed()) {
                clearInterval(intervalId);
                return;
            }

            const uiPosition = tabManager.uiPosition || 'top';
            if (uiPosition === 'top') {
                if (!isHovered) {
                    try {
                        mainWindow.setTitleBarOverlay({ symbolColor: '#ffffff' });
                    } catch (e) {}
                    isHovered = true;
                }
                return;
            }

            if (!mainWindow.isFocused() || !mainWindow.isVisible()) {
                if (isHovered) {
                    try {
                        mainWindow.setTitleBarOverlay({ symbolColor: '#00000000' });
                    } catch (e) {}
                    isHovered = false;
                }
                return;
            }

            const mousePoint = screen.getCursorScreenPoint();
            const winBounds = mainWindow.getBounds();

            const overlayX = winBounds.x + winBounds.width - 140;
            const overlayY = winBounds.y;

            const inOverlayRegion = 
                mousePoint.x >= overlayX && 
                mousePoint.x <= winBounds.x + winBounds.width &&
                mousePoint.y >= overlayY &&
                mousePoint.y <= winBounds.y + 35;

            if (inOverlayRegion) {
                if (!isHovered) {
                    try {
                        mainWindow.setTitleBarOverlay({ symbolColor: '#ffffff' });
                    } catch (e) {}
                    isHovered = true;
                }
            } else {
                if (isHovered) {
                    try {
                        mainWindow.setTitleBarOverlay({ symbolColor: '#00000000' });
                    } catch (e) {}
                    isHovered = false;
                }
            }
        }, 150);

        mainWindow.on('closed', () => {
            clearInterval(intervalId);
        });
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }

    getWindowAtPoint(screenX, screenY, excludeWindowId = null) {
        for (const [windowId, data] of this.windows) {
            if (windowId === excludeWindowId) continue;

            const bounds = data.window.getBounds();

            if (screenX >= bounds.x && screenX < bounds.x + bounds.width &&
                screenY >= bounds.y && screenY < bounds.y + bounds.height) {
                return data;
            }

        }

        return null;
    }
}

module.exports = new WindowManager();
