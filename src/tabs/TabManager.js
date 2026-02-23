const { WebContentsView, app, Menu, clipboard} = require('electron');
const WindowResizing = require('../main/WindowResizing');
const fs = require('fs');
const path = require('path');


class TabManager {



    constructor(mainWindow, ui) {
        this.isLoading = false;
        this.mainWindow = mainWindow;
        this.ui = ui; 
        this.tabs = [];
        this.mainTab = null;
        this.currentIndex = -1;
        this.lastOpenedTabs = [];
        this.settingsUI = null; 
        this.defaultSite = "https://google.com";
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.loadConfig();

    }

    setSettingsUI(view) {
        this.settingsUI = view;

        if (this.settingsUI && !this.settingsUI.webContents.isDestroyed()) {

            this.settingsUI.webContents.once('did-finish-load', () => {
                
                this.settingsUI.webContents.send("initSettings", { defaultSite: this.defaultSite });
                this.sendTabData();
            });
        }

    }

    createTab(newAddress = "", switchTo = true) {
        let newTab = {
            contentView: new WebContentsView({
                webPreferences: {
                    partition: "persist:main"
                }
            }),
            address: "",
            title: "",
            isActive: true,
            isStacked: false,
            stackInd: -1,
            lastActiveAt: Date.now(),
            keepActive: false
        };
        const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<major>.0.0.0 Safari/537.36";

        newTab.contentView.webContents.setUserAgent(userAgent);

        
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

            this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tabToClose);
            
            this.tabs.splice(tabID, 1);

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
            app.quit();
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
        this.tabs.splice(index, 1);
        this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tab);


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

        this.attachContextMenu(newTab);

        this.switchTab(this.tabs.length - 1);
        this.lastOpenedTabs.push(tab);
        this.sendTabData();
    }







    attachContextMenu(tab) {
        
        tab.contentView.webContents.on('context-menu', (event, params) => {
            const menuTemplate = [];

            if (params.linkURL) {

                menuTemplate.push({
                    label: 'Open Link in New Tab',
                    click: () => this.createTab(params.linkURL, false)
                });

                menuTemplate.push({
                    label: 'Copy Link Address',
                    click: () => clipboard.writeText(params.linkURL)
                });

                menuTemplate.push({ type: 'separator' });
            }

            if (params.mediaType === 'image') {

                menuTemplate.push({
                    label: 'Open Image in New Tab',
                    click: () => this.createTab(params.srcURL, false)
                });

                menuTemplate.push({
                    label: 'Copy Image',
                    click: () => tab.contentView.webContents.copyImageAt(params.x, params.y)
                });

                menuTemplate.push({
                    label: 'Copy Image Address',
                    click: () => clipboard.writeText(params.srcURL)
                });

                menuTemplate.push({ type: 'separator' });
            }

            if (params.selectionText) {
                menuTemplate.push({ role: 'copy' });
            }

    
        
            menuTemplate.push({
                label: 'Reload',
                click: () => tab.contentView.webContents.reload()
            });

            menuTemplate.push({ type: 'separator' });

            menuTemplate.push({
                label: 'Inspect Element',
                click: () => tab.contentView.webContents.inspectElement(params.x, params.y)
            });

            const menu = Menu.buildFromTemplate(menuTemplate);
            menu.popup();
        });
    }






    updateDefaultSite(site) {
        this.defaultSite = site;

        this.saveConfig();
        if (this.settingsUI && !this.settingsUI.webContents.isDestroyed()) {

            this.settingsUI.webContents.send("initSettings", { defaultSite: this.defaultSite });

        }}




    loadConfig() {
        
        try {
            if (fs.existsSync(this.configPath)) {
                this.isLoading = true;

                const data = fs.readFileSync(this.configPath);
                const config = JSON.parse(data);

                if (config.defaultSite) {
                    this.defaultSite = config.defaultSite;
                    
                }

                if (config.tabs && Array.isArray(config.tabs)) {
                    
                    config.tabs.forEach(tabData => {
                        this.createTab(tabData.address, false);
                    });
                    if (this.tabs.length > 0) {
                        this.switchTab(this.tabs.length - 1);
                    }
                }

                this.isLoading = false;
            }
        } 
        
        catch (error) {
            console.error("Error loading config:", error);
            this.isLoading = false;
        }
    }

    saveConfig() {
        if (this.isLoading) return;


        try {
            const savedTabs = this.tabs.map(tab => ({
                address: tab.address,
                title: tab.title
            }));

            const config = {
                defaultSite: this.defaultSite,
                tabs: savedTabs,
            };

            fs.writeFileSync(this.configPath, JSON.stringify(config));
        } 
        
        catch (error) {
            console.error("Error saving: ", error);
        }
    }
}

module.exports = TabManager;

