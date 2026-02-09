const { WebContentsView, app } = require('electron');
const WindowResizing = require('../main/WindowResizing');

class TabManager {
    constructor(mainWindow, ui) {
        this.mainWindow = mainWindow;
        this.ui = ui; 
        this.tabs = [];
        this.mainTab = null;
        this.currentIndex = -1;
        this.lastOpenedTabs = [];
        this.settingsUI = null; 
    }

    setSettingsUI(view) {
        this.settingsUI = view;
    }

    createTab() {
        let newTab = {
            contentView: new WebContentsView(),
            address: "",
            title: "",
            isActive: true,
            isStacked: false,
            stackInd: -1,
            lastActiveAt: Date.now(),
            keepActive: false
        };

        this.tabs.push(newTab);
        newTab.contentView.webContents.loadURL('https://google.com');

        newTab.contentView.webContents.on('page-title-updated', () => {
            newTab.title = newTab.contentView.webContents.getTitle();
            newTab.address = newTab.contentView.webContents.getURL();
            this.sendTabData();
        });

        this.mainTab = newTab;
        this.switchTab(this.tabs.length - 1);
        this.lastOpenedTabs.push(this.mainTab);
        
        WindowResizing.resize();
    }

    switchTab(tabID) {
        if (tabID >= this.tabs.length) return;

        if (this.tabs[tabID].contentView == null) {
            this.wake(tabID);
        }

        if (this.mainTab && this.mainTab.contentView) {
            this.mainWindow.contentView.removeChildView(this.mainTab.contentView);
        }

        this.mainTab = this.tabs[tabID];
        this.mainTab.lastActiveAt = Date.now();
        this.mainWindow.contentView.addChildView(this.mainTab.contentView);
        this.currentIndex = tabID;
        this.tabs[tabID].lastActiveAt = Date.now();

        WindowResizing.resize();
        this.sendTabData();
    }

    closeTab(tabID) {
        if (tabID < this.tabs.length && this.tabs.length > 1) {
            let tabToClose = this.tabs[tabID];
            this.tabs.splice(tabID, 1);

            if (tabToClose.contentView) {
                this.mainWindow.contentView.removeChildView(tabToClose.contentView);
                tabToClose.contentView.webContents.close();
            }

            if (tabID === this.currentIndex) {
                if (this.tabs.length > 0) {
                    this.switchTab(0);
                } else {
                    this.mainTab = null;
                    this.currentIndex = -1;
                }
            } 
            
            else if (tabID < this.currentIndex) {
                this.currentIndex--;
            }
            this.sendTabData();

        } 
        
        else if (this.tabs.length === 1) {
            app.quit();
        }
    }

    sleep(index) {
        const tab = this.tabs[index];
        if (!tab.isActive) return;

        tab.isActive = false;
        
        // If putting the currently viewable tab to sleep, switch to another
        if (index === this.currentIndex) {
            if (index === 0) {
                this.tabs.length === 0 ? this.closeTab(0) : this.switchTab(1);
            } else {
                this.switchTab(0);
            }
        }

        if (tab.contentView.webContents && !tab.contentView.webContents.isDestroyed()) {
            tab.contentView.webContents.close();
        }
        tab.contentView = null;
        this.sendTabData();
        WindowResizing.resize();
    }

    wake(index) {
        const tab = this.tabs[index];
        tab.contentView = new WebContentsView();
        tab.contentView.webContents.loadURL(tab.address);
        tab.isActive = true;
    }

    reorderTabs(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.tabs.length || toIndex < 0 || toIndex >= this.tabs.length) return;

        const tabToMove = this.tabs[fromIndex];
        this.tabs.splice(fromIndex, 1);
        this.tabs.splice(toIndex, 0, tabToMove);

        if (this.mainTab) {
            this.currentIndex = this.tabs.indexOf(this.mainTab);
        }
        this.sendTabData();
    }

    sendTabData() {
        const tabData = this.tabs.map((tab, index) => ({
            index: index,
            isMainTab: index === this.currentIndex,
            title: tab.title || "",
            address: tab.address,
            isActive: tab.isActive,
            lastActiveAt: tab.lastActiveAt,
            keepActive: tab.keepActive
        }));

        this.ui.webContents.send("updateTabs", tabData);

        if (this.settingsUI && !this.settingsUI.webContents.isDestroyed()) {
            this.settingsUI.webContents.send("updateTabs", tabData);
        }
    }

    getMainTab() { return this.mainTab; }
    getTab(index) { return this.tabs[index]; }
    
    closeLastOpened() {
        if(this.lastOpenedTabs.length > 0) {
             const tab = this.lastOpenedTabs.pop();
             const idx = this.tabs.indexOf(tab);
             if(idx > -1) this.closeTab(idx);
        }
    }

    toggleKeepActive(index) {
        if(this.tabs[index]) {
            this.tabs[index].keepActive = !this.tabs[index].keepActive;
        }
    }

    reloadTab(index) {
         if (this.tabs[index] && this.tabs[index].contentView) {
            this.tabs[index].contentView.webContents.reload();
          }
    }
}

module.exports = TabManager;