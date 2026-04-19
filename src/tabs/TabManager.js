const { WebContentsView, app} = require('electron');
const WindowResizing = require('../main/WindowResizing');
const path = require('path');

const TabStacking = require('./TabStacking');
const TabContextMenu = require('./TabContextMenu');
const TabConfig = require('./TabConfig');

class TabManager {



    constructor(mainWindow, ui, skipConfig = false) {
        this.isLoading = false;
        this.mainWindow = mainWindow;
        this.ui = ui; 
        this.tabs = [];
        this.mainTab = null;
        this.currentIndex = -1;
        this.lastOpenedTabs = [];
        this.settingsUI = null; 
        this.defaultSite = "https://google.com";
        this.searchEngine = "https://www.google.com/search?q=";
        this.stackNames = {};
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        if (!skipConfig){
            this.loadConfig();
        }

    }

    createTab(newAddress = "", switchTo = true, isStacked = false, stackId = null) {
        let newTab = {
            contentView: new WebContentsView({
                webPreferences: {
                    partition: "persist:main"
                }
            }),
            address: "",
            title: "",
            isActive: true,
            isStacked: isStacked,
            stackId: stackId,
            lastActiveAt: Date.now(),
            keepActive: false
        };
        
        //const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
        //newTab.contentView.webContents.setUserAgent(userAgent);

        
        this.tabs.push(newTab);
      
         if (!newAddress){
            newTab.contentView.webContents.loadURL(this.defaultSite); 
        }
        
        else{
            newTab.contentView.webContents.loadURL(newAddress); 
        }
       

        newTab.contentView.webContents.on('page-title-updated', () => {
            newTab.title = newTab.contentView.webContents.getTitle();
            newTab.address = newTab.contentView.webContents.getURL();
            this.sendTabData();
        });

        newTab.contentView.webContents.setWindowOpenHandler((desc) => {
            if (desc.features && (desc.features.includes("width") || desc.features.includes("height"))){
                return {action: "allow"};
            }

            this.createTab(desc.url, false);
            return {action: "deny"}
        })

        
        this.attachContextMenu(newTab);
        
        if (switchTo){
            this.switchTab(this.tabs.length - 1);
            this.mainTab = newTab;
        }
        

        this.lastOpenedTabs.push(newTab);

        
        newTab.title = newTab.contentView.webContents.getTitle();
        

        
        this.sendTabData();
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

        WindowResizing.resize(this.mainWindow, this.ui, this);
        
        this.sendTabData();
    }

    closeTab(tabID) {
        if (tabID < this.tabs.length && this.tabs.length > 1) {
            let tabToClose = this.tabs[tabID];
            const oldStackId = tabToClose.stackId;

            this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tabToClose);
            
            this.tabs.splice(tabID, 1);

            if (oldStackId) {
                const remaining = this.tabs.filter(t => t.stackId === oldStackId);

                if (remaining.length < 2) {
                    remaining.forEach(t => {
                        t.isStacked = false;
                        t.stackId = null;
                    });
                    delete this.stackNames[oldStackId];
                }
            }

            if (tabToClose.contentView) {


                try{
                    this.mainWindow.contentView.removeChildView(tabToClose.contentView);

                }

                catch(e) {
                    
                }


            try {
                if (tabToClose.contentView.webContents && !tabToClose.contentView.webContents.isDestroyed()) {
                    tabToClose.contentView.webContents.destroy();
                }
            } 
            catch (e) {
                console.log("Error in closing or already closed \n Message: " + e)
            }

                
                tabToClose = null;
                
            }

            if (tabID === this.currentIndex) {
                if (this.tabs.length > 0) {
                    this.switchTab(0);
                } 
                else {
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
            this.mainWindow.close();
        }
    }

    sleep(index) {
        const tab = this.tabs[index];
        if (!tab.isActive && tab != this.mainTab){
            this.mainTab.lastActiveAt = new Date();
            return;
        }

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
        WindowResizing.resize(this.mainWindow, this.ui, this);
    }

    wake(index) {
        const tab = this.tabs[index];
        tab.contentView = new WebContentsView({
            webPreferences: {
                partition: "persist:main"
            }
        });
        tab.contentView.webContents.loadURL(tab.address);
        tab.isActive = true;
    }

    reorderTabs(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.tabs.length) return;
        
        if (toIndex < 0) toIndex = 0;
        if (toIndex >= this.tabs.length) toIndex = this.tabs.length - 1;

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
            keepActive: tab.keepActive,
            isStacked: tab.isStacked,
            stackId: tab.stackId,
            stackName: tab.stackId ? (this.stackNames[tab.stackId] || null) : null
        }));

        this.ui.webContents.send("updateTabs", tabData);
        this.saveConfig();

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




    popTab(index) {
        if (index < 0 || index >= this.tabs.length) return null;

        const tab = this.tabs[index];
        const oldStackId = tab.stackId;

        this.tabs.splice(index, 1);
        this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tab);

        if (oldStackId) {
            const remaining = this.tabs.filter(t => t.stackId === oldStackId);

            if (remaining.length < 2) {
                remaining.forEach(t => {
                    t.isStacked = false;
                    t.stackId = null;
                });
                delete this.stackNames[oldStackId];
            }
        }

        if (tab.contentView) {
            try {
                this.mainWindow.contentView.removeChildView(tab.contentView);
            } 
            
            catch (e) {
                console.log("tab not attached, should probably be ignored")
            }
        }

        if (index === this.currentIndex) {
            if (this.tabs.length > 0) {
                 const newIndex = index > 0 ? index - 1 : 0;
                 this.switchTab(newIndex);
            }
            
            else {
                this.mainTab = null;
                this.currentIndex = -1;
            }
        } 
        
        
        else if (index < this.currentIndex) {
            this.currentIndex--;
        }


        this.sendTabData();
        return tab;
    }


    stickTab(tab) {
        this.tabs.push(tab);
        
        tab.contentView.webContents.removeAllListeners('page-title-updated');
        tab.contentView.webContents.on('page-title-updated', () => {
            tab.title = tab.contentView.webContents.getTitle();
            tab.address = tab.contentView.webContents.getURL();
            this.sendTabData();
        });
        
        tab.contentView.webContents.setWindowOpenHandler((desc) => {
             if (desc.features && (desc.features.includes("width") || desc.features.includes("height"))){
                return {action: "allow"};
            }

            this.createTab(desc.url, false);
            return {action: "deny"}
        });

        this.attachContextMenu(tab);

        this.switchTab(this.tabs.length - 1);
        this.lastOpenedTabs.push(tab);
        this.sendTabData();
    }

}

Object.assign(TabManager.prototype, TabStacking);
Object.assign(TabManager.prototype, TabContextMenu);
Object.assign(TabManager.prototype, TabConfig);



module.exports = TabManager;
