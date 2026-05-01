const { app } = require('electron');
const WindowResizing = require('../main/WindowResizing');
const path = require('path');

const TabStacking = require('./TabStacking');
const TabContextMenu = require('./TabContextMenu');
const TabConfig = require('./TabConfig');


const {
    SETTINGS_ADDRESS,
    attachTabLifecycle,
    createRegularContentView,
    createRegularTab,
    createSettingsContentView,
    createSettingsTab,
    destroyContentView,
    isLiveWebContents,
    loadRegularTabContent,
    loadSettingsTabContent,
    syncTabState
} = require('./tabCreator');



class TabManager {



    constructor(mainWindow, ui, skipConfig = false) {
        this.isLoading = false;
        this.mainWindow = mainWindow;
        this.ui = ui; 
        this.tabs = [];
        this.mainTab = null;
        this.currentIndex = -1;
        this.lastOpenedTabs = [];
        this.defaultSite = "https://google.com";
        this.searchEngine = "https://www.google.com/search?q=";
        this.stackNames = {};
        this.nextStackNumber = 1;
        this.stackBarVisible = false;
        this.saveTimer = null;
        this.configPath = path.join(app.getPath('userData'), 'config.json');

        if (!skipConfig) {
            this.loadConfig();
        }
    }

    setStackBarVisible(visible) {
        this.stackBarVisible = visible;
    }

    resizeWindow() {
        WindowResizing.resize(this.mainWindow, this.ui, this, this.stackBarVisible);
    }

    removeContentView(contentView) {
        if (!contentView) return;

        try {
            this.mainWindow.contentView.removeChildView(contentView);
        } catch (error) {
            
        }
    }

    createTab(newAddress = "", switchTo = true, isStacked = false, stackId = null) {
        let newTab = createRegularTab({
            address: newAddress,
            defaultSite: this.defaultSite,
            isStacked: isStacked,
            stackId: stackId
        });

        attachTabLifecycle(this, newTab);
        
        this.tabs.push(newTab);
        this.lastOpenedTabs.push(newTab);

        if (switchTo) {
            this.switchTab(this.tabs.length - 1);
        }

        this.sendTabData();
        return newTab;
    }

    createSettingsTab(switchTo = true) {
        let newTab = createSettingsTab();

        attachTabLifecycle(this, newTab);
        
        this.tabs.push(newTab);
        this.lastOpenedTabs.push(newTab);

        if (switchTo) {
            this.switchTab(this.tabs.length - 1);
        }

        this.sendTabData();

        return newTab.contentView;
    }

  

    switchTab(tabID) {
        if (tabID < 0 || tabID >= this.tabs.length) return;

        let nextTab = this.tabs[tabID];
        if (!nextTab.contentView) {
            this.wake(tabID);
        }

        if (this.mainTab && this.mainTab.contentView) {
            this.removeContentView(this.mainTab.contentView);
        }

        this.mainTab = nextTab;
        this.mainTab.lastActiveAt = Date.now();
        this.mainWindow.contentView.addChildView(this.mainTab.contentView);
        this.currentIndex = tabID;

        this.resizeWindow();
        this.sendTabData();
    }

    closeTab(tabID) {
        if (tabID < 0 || tabID >= this.tabs.length) return;

        if (this.tabs.length === 1) {
            this.mainWindow.close();
            return;
        }

        let tabToClose = this.tabs[tabID];
        const oldStackId = tabToClose.stackId;

        this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tabToClose);
        
        this.tabs.splice(tabID, 1);
        this.cleanupStack(oldStackId);

        if (typeof tabToClose.lifecycleCleanup === 'function') {
            tabToClose.lifecycleCleanup();
        }

        this.removeContentView(tabToClose.contentView);
        
        try {
            destroyContentView(tabToClose.contentView);
        } 
        catch (e) {
            console.log("Error in closing or already closed \n Message: " + e)
        }
        
        tabToClose.contentView = null;

        if (tabID === this.currentIndex) {
            const nextIndex = Math.min(tabID, this.tabs.length - 1);

            if (nextIndex >= 0) {
                this.switchTab(nextIndex);
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

    sleep(index) {
        const tab = this.tabs[index];
        if (!tab || !tab.isActive || !tab.contentView) return;

        const fallbackIndex = this.tabs.findIndex((candidate, candidateIndex) => candidateIndex !== index);
        if (index === this.currentIndex && fallbackIndex === -1) {
            return;
        }

        tab.isActive = false;
        
        if (index === this.currentIndex) {
            this.switchTab(fallbackIndex);
        }

        if (typeof tab.lifecycleCleanup === 'function') {
            tab.lifecycleCleanup();
        }

        destroyContentView(tab.contentView);
        tab.contentView = null;
        this.sendTabData();
        this.resizeWindow();
    }

    wake(index) {
        const tab = this.tabs[index];
        if (!tab || tab.contentView) return;

        tab.contentView = tab.isSettingsTab ? createSettingsContentView() : createRegularContentView();

        if (tab.isSettingsTab) {
            loadSettingsTabContent(tab);
        } 
        
        else {
            loadRegularTabContent(tab, tab.address, this.defaultSite);
        }

        attachTabLifecycle(this, tab);
        tab.isActive = true;
        syncTabState(tab);
    }

    reorderTabs(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.tabs.length) return;
        
        const boundedIndex = Math.max(0, Math.min(toIndex, this.tabs.length - 1));
        const [tabToMove] = this.tabs.splice(fromIndex, 1);
        this.tabs.splice(boundedIndex, 0, tabToMove);

        if (this.mainTab) {
            this.currentIndex = this.tabs.indexOf(this.mainTab);
        }
        this.sendTabData();
    }

    reorderStack(stackId, toIndex) {
        const stackTabs = this.tabs.filter(t => t.stackId === stackId);
        if (stackTabs.length === 0) return;

        const nonStackTabs = this.tabs.filter(t => t.stackId !== stackId);
        const boundedIndex = Math.max(0, Math.min(toIndex, nonStackTabs.length));

        nonStackTabs.splice(boundedIndex, 0, ...stackTabs);
        this.tabs = nonStackTabs;

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
            stackName: tab.stackId ? (this.stackNames[tab.stackId] || null) : null,
            isSettingsTab: Boolean(tab.isSettingsTab)
        }));

        this.ui.webContents.send("updateTabs", tabData);
        this.saveConfig();

        const settingsTabs = this.getSettingsTabs();
      
        settingsTabs.forEach(t => {
            t.contentView.webContents.send("updateTabs", tabData);
        });
    }

    replaceTabContent(tab, nextContentView, { isSettingsTab, loadContent }) {
        const oldContentView = tab.contentView;

        if (typeof tab.lifecycleCleanup === 'function') {
            tab.lifecycleCleanup();
        }

        tab.contentView = nextContentView;
        tab.isSettingsTab = isSettingsTab;

        loadContent(tab);
        attachTabLifecycle(this, tab);

        if (this.mainTab === tab) {
            this.removeContentView(oldContentView);
            this.mainWindow.contentView.addChildView(nextContentView);
            this.resizeWindow();
        }

        destroyContentView(oldContentView);
        
        this.sendTabData();
        return nextContentView;
    }

    navigateTabToSettings(index) {
        const tab = this.tabs[index];
        if (!tab || tab.isSettingsTab) return null;
    
        return this.replaceTabContent(tab, createSettingsContentView(), {
            isSettingsTab: true,
            loadContent: loadSettingsTabContent
        });
    }

    navigateTabToRegular(index, address) {
        const tab = this.tabs[index];
        if (!tab || !tab.isSettingsTab) return null;

        return this.replaceTabContent(tab, createRegularContentView(), {
            isSettingsTab: false,
            loadContent: (targetTab) => {
                loadRegularTabContent(targetTab, address, this.defaultSite);
            }
        });
    }

    getMainTab() { 
        return this.mainTab; 
    }
    
    getTab(index) { 
        return this.tabs[index]; 
    }
    
    closeLastOpened() {
        if (this.lastOpenedTabs.length > 0) {
             const tab = this.lastOpenedTabs.pop();
             const idx = this.tabs.indexOf(tab);
             if (idx > -1) this.closeTab(idx);
        }
    }

    toggleKeepActive(index) {
        if (this.tabs[index]) {
            this.tabs[index].keepActive = !this.tabs[index].keepActive;
            this.sendTabData();
        }
    }

    reloadTab(index) {
         if (this.tabs[index] && this.tabs[index].contentView && isLiveWebContents(this.tabs[index].contentView)) {
            this.tabs[index].contentView.webContents.reload();
        } 
    }

    popTab(index) {
        if (index < 0 || index >= this.tabs.length) return null;

        const tab = this.tabs[index];
        const oldStackId = tab.stackId;

        this.tabs.splice(index, 1);
        this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tab);
        
        this.cleanupStack(oldStackId);

        if (typeof tab.lifecycleCleanup === 'function') {
            tab.lifecycleCleanup();
        }

        if (tab.contentView) {
            try {
                this.mainWindow.contentView.removeChildView(tab.contentView);
            } 
            catch (e) {
                console.log("tab not attached, should probably be ignored");
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
        if (!tab) return;
        
        attachTabLifecycle(this, tab);
        syncTabState(tab);

        this.tabs.push(tab);
        this.lastOpenedTabs.push(tab);
        this.switchTab(this.tabs.length - 1);
        this.sendTabData();
    }

}

Object.assign(TabManager.prototype, TabStacking);
Object.assign(TabManager.prototype, TabContextMenu);
Object.assign(TabManager.prototype, TabConfig);



module.exports = TabManager;
