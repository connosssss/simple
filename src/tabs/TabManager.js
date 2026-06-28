const { app } = require('electron');
const WindowResizing = require('../main/WindowResizing');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const TabStacking = require('./TabStacking');
const TabContextMenu = require('./TabContextMenu');
const TabConfig = require('./TabConfig');
const { Tree } = require('./TabTree');
const Bookmarks = require('../bookmarks/bookmarks');



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

const INTERNAL_PAGES = new Set(["about://settings", "about://history"]);



class TabManager {



    constructor(mainWindow, ui, skipConfig = false) {
        this.isLoading = false;
        this.mainWindow = mainWindow;
        this.ui = ui; 
        this.tabs = [];
        this.tabTree = new Tree();
        this.mainTab = null;
        this.currentIndex = -1;
        this.lastOpenedTabs = [];
        this.defaultSite = "https://google.com";
        this.searchEngine = "https://www.google.com/search?q=";
        this.showBookmarkBar = true;
        this.closeAfter = 10;
        this.stackNames = {};
        this.nextStackNumber = 1;
        this.stackBarsVisible = 0;
        this.bookmarkBarVisible = false;
        this.saveTimer = null;
        this.dropdownVisible = false;
        this.downloadsDropdownVisible = false;
        this.uiPosition = 'top';
        this.configPath = path.join(app.getPath('userData'), 'config.json');

        if (!skipConfig) {
            this.loadConfig();
        }

        this.startAutoHibernationChecker();

    }

    setStackBarsVisible(count) {
        this.stackBarsVisible = count;
    }

    setDropdownVisible(visible) {
        this.dropdownVisible = !!visible;
        this.tabTree.addressBar.setDropdownVisible(visible);
        this.resizeWindow();
    }

    setDownloadsDropdownVisible(visible) {
        this.downloadsDropdownVisible = !!visible;
        this.tabTree.addressBar.setDownloadsDropdownVisible(visible);
        this.resizeWindow();
    }

    rebuildTabTree() {
        this.tabTree.rebuildFromTabs(this.tabs, this.stackNames);
    }


    resizeWindow() {
        WindowResizing.resize(this.mainWindow, this.ui, this, this.stackBarsVisible);
    }

    removeContentView(contentView) {
        if (!contentView) return;

        try {
            this.mainWindow.contentView.removeChildView(contentView);
        } catch (error) {
            
        }
    }

    createTab(newAddress = "", switchTo = true, isStacked = false, stackId = null, stackIds = null) {
        let preventStackInherit = false;
        if (typeof newAddress === "object" && newAddress !== null) {
            ({
                address: newAddress = "",
                switchTo = true,
                isStacked = false,
                stackId = null,
                stackIds = null,
                preventStackInherit = false
            } = newAddress);
        }

        // Inherit stack context if in stacks and no explicit stack config is provided
        if (!preventStackInherit && !isStacked && !stackId && (!stackIds || stackIds.length === 0)) {
            const activeTab = this.tabs[this.currentIndex];
            if (activeTab && activeTab.stackIds && activeTab.stackIds.length > 0) {
                isStacked = true;
                stackIds = [...activeTab.stackIds];
                stackId = stackIds[0];
            }
        }

        if (INTERNAL_PAGES.has(newAddress)) {
            const contentView = this.createSettingsTab(newAddress, switchTo);
            return contentView;
        }

        let newTab = createRegularTab({
            address: newAddress,
            defaultSite: this.defaultSite,
            isStacked: isStacked,
            stackId: stackId,
            stackIds: stackIds
        });

        if (stackIds && stackIds.length > 0) {
            newTab.stackIds = [...stackIds];
            newTab.stackId = stackIds[0];
            newTab.isStacked = true;
        }

        else if (!newTab.stackIds) {
            newTab.stackIds = newTab.stackId ? [newTab.stackId] : [];
        }

        attachTabLifecycle(this, newTab);
        
        this.tabs.push(newTab);
        this.lastOpenedTabs.push(newTab);
        this.rebuildTabTree();

        if (switchTo) {
            this.switchTab(this.tabs.length - 1);
        }
        else {
            if (newAddress && !INTERNAL_PAGES.has(newAddress)) {
                this.setInactiveTabTitle(newTab, newAddress);
            }
        }

        this.sendTabData(true);
        return newTab;
    }

    createSettingsTab(address = "about://settings", switchTo = true) {
        let newTab = createSettingsTab(address);

        if (!newTab.stackIds) newTab.stackIds = [];

        attachTabLifecycle(this, newTab);
        
        this.tabs.push(newTab);
        this.lastOpenedTabs.push(newTab);
        this.rebuildTabTree();

        if (switchTo) {
            this.switchTab(this.tabs.length - 1);
        }

        this.sendTabData(true);

        return newTab.contentView;
    }

  

    switchTab(tabID) {
        if (tabID < 0 || tabID >= this.tabs.length) return;

        let nextTab = this.tabs[tabID];
        if (!nextTab.contentView) {
            this.wake(tabID);
        }

        if (this.mainTab && this.mainTab.contentView) {
            this.mainTab.lastActiveAt = Date.now();
            this.removeContentView(this.mainTab.contentView);
        }

        this.mainTab = nextTab;
        this.mainTab.lastActiveAt = Date.now();
        this.tabTree.addressBar.setAddress(this.mainTab.isNewTab ? "" : this.mainTab.address);
        this.mainWindow.contentView.addChildView(this.mainTab.contentView);
        
        try {
            this.mainWindow.contentView.removeChildView(this.ui);
            this.mainWindow.contentView.addChildView(this.ui);
        } 
        catch (err) {
            console.error("Failed to layer-order UI view on switchTab:", err);
        }

        this.currentIndex = tabID;

        // Track last visited tab on each stack this tab belongs to
        if (nextTab.stackIds && nextTab.stackIds.length > 0 && nextTab.id) {
            nextTab.stackIds.forEach(sid => {
                this.tabTree.setStackLastVisitedTab(sid, nextTab.id);
            });
        }

        this.resizeWindow();
        this.sendTabData(true);
    }

    closeTab(tabID) {
        if (tabID < 0 || tabID >= this.tabs.length) return;

        if (this.tabs.length === 1) {
            this.mainWindow.close();
            return;
        }

        let tabToClose = this.tabs[tabID];
        const oldStackIds = tabToClose.stackIds ? [...tabToClose.stackIds] : [];

        this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tabToClose);
        
        this.tabs.splice(tabID, 1);
        this.rebuildTabTree();
        
        oldStackIds.forEach(id => this.cleanupStack(id));

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
        this.sendTabData(true);
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
        this.sendTabData(true);
        this.resizeWindow();
    }

    hibernateTabs(indices) {
        const isActiveSelected = indices.includes(this.currentIndex);
        
        if (isActiveSelected) {
            const fallbackIndex = this.tabs.findIndex((_, idx) => !indices.includes(idx));
            if (fallbackIndex !== -1) {
                this.switchTab(fallbackIndex);
            }
        }

        indices.forEach(idx => {
            if (idx === this.currentIndex) return;
            const tab = this.tabs[idx];
            if (tab && tab.isActive && tab.contentView) {
                tab.isActive = false;
                if (typeof tab.lifecycleCleanup === 'function') {
                    tab.lifecycleCleanup();
                }
                destroyContentView(tab.contentView);
                tab.contentView = null;
            }
        });

        this.sendTabData(true);
        this.resizeWindow();
    }

    closeTabs(indices) {
        const sortedIndices = [...indices].sort((a, b) => b - a);
        sortedIndices.forEach(idx => {
            this.closeTab(idx);
        });
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
        this.rebuildTabTree();

        if (this.mainTab) {
            this.currentIndex = this.tabs.indexOf(this.mainTab);
        }
        this.sendTabData(true);
    }

    reorderStack(stackId, toIndex) {
        const stackTabs = this.tabs.filter(t => t.stackIds && t.stackIds.includes(stackId));
        if (stackTabs.length === 0) return;

        const nonStackTabs = this.tabs.filter(t => !t.stackIds || !t.stackIds.includes(stackId));
        const boundedIndex = Math.max(0, Math.min(toIndex, nonStackTabs.length));

        nonStackTabs.splice(boundedIndex, 0, ...stackTabs);
        this.tabs = nonStackTabs;
        this.rebuildTabTree();

        if (this.mainTab) {
            this.currentIndex = this.tabs.indexOf(this.mainTab);
        }
        this.sendTabData(true);
    }

    sendTabData(forceSave = false) {
        this.rebuildTabTree();
        if (this.mainTab) {
            this.tabTree.addressBar.setAddress(this.mainTab.isNewTab ? "" : this.mainTab.address);
        }

        const tabData = this.tabs.map((tab, index) => ({
            id: tab.id || (tab.id = require('crypto').randomUUID()),
            index: index,
            isMainTab: index === this.currentIndex,
            title: tab.title || "",
            address: tab.address,
            isActive: tab.isActive,
            iconURL: tab.iconURL || "",
            lastActiveAt: tab.lastActiveAt,
            keepActive: tab.keepActive,
            isStacked: tab.stackIds && tab.stackIds.length > 0,
            stackId: tab.stackIds && tab.stackIds.length > 0 ? tab.stackIds[0] : null,
            stackIds: tab.stackIds || [],
            stackName: (tab.stackIds && tab.stackIds.length > 0) ? (this.stackNames[tab.stackIds[0]] || null) : null,
            stackNames: (tab.stackIds || []).map(id => this.stackNames[id] || null),
            isSettingsTab: Boolean(tab.isSettingsTab),
            isNewTab: Boolean(tab.isNewTab),
            isLoading: Boolean(tab.isLoading)
        }));

        const treeData = this.tabTree.toJSON();

        this.ui.webContents.send("updateTabs", tabData, treeData);
        this.saveConfig(forceSave);

        const settingsTabs = this.getSettingsTabs();
      
        settingsTabs.forEach(t => {
            t.contentView.webContents.send("updateTabs", tabData, treeData);
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
            
            // Ensure UI view is always on top of page content views
            try {
                this.mainWindow.contentView.removeChildView(this.ui);
                this.mainWindow.contentView.addChildView(this.ui);
            } catch (err) {
                console.error("Failed to layer-order UI view on replaceTabContent:", err);
            }

            this.resizeWindow();
        }

        destroyContentView(oldContentView);
        
        this.sendTabData(true);
        return nextContentView;
    }

    navigateTabToSettings(index, address = "about://settings") {
        const tab = this.tabs[index];
        if (!tab || tab.isSettingsTab) return null;
    
        return this.replaceTabContent(tab, createSettingsContentView(), {
            isSettingsTab: true,
            loadContent: (targetTab) => {
                targetTab.address = address;
                loadSettingsTabContent(targetTab);
            }
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
            this.sendTabData(true);
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
        const oldStackIds = tab.stackIds ? [...tab.stackIds] : [];

        this.tabs.splice(index, 1);
        this.lastOpenedTabs = this.lastOpenedTabs.filter(t => t !== tab);
        this.rebuildTabTree();
        
        oldStackIds.forEach(id => this.cleanupStack(id));

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

        this.sendTabData(true);
        return tab;
    }

    stickTab(tab) {
        if (!tab) return;
        
        attachTabLifecycle(this, tab);
        syncTabState(tab);

        this.tabs.push(tab);
        this.lastOpenedTabs.push(tab);
        this.rebuildTabTree();
        this.switchTab(this.tabs.length - 1);
        this.sendTabData(true);
    }

    togglePictureInPicture(tab, x = null, y = null) {
        if (!tab || !tab.contentView || !tab.contentView.webContents) return;
        
        const script = `
            (async () => {
                try {
                    if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                        return 'exited';
                    }
                    
                    let target;
                    const x = ${x};
                    const y = ${y};
                    
                    if (x !== null && y !== null) {
                        const el = document.elementFromPoint(x, y);
                        target = el && el.tagName === 'VIDEO' ? el : (document.querySelector('video:hover') || document.querySelector('video'));
                    } 

                    else {
                        const videos = Array.from(document.querySelectorAll('video'));
                        if (videos.length === 0) return 'no-video';
                        const playing = videos.filter(v => !v.paused && !v.ended);
                        target = playing.length > 0
                            ? playing.reduce((a, b) => (a.videoWidth * a.videoHeight) >= (b.videoWidth * b.videoHeight) ? a : b)
                            : videos.reduce((a, b) => (a.videoWidth * a.videoHeight) >= (b.videoWidth * b.videoHeight) ? a : b);
                    }
                    
                    if (target) {
                        await target.requestPictureInPicture();
                        return 'pip';
                    }
                } 

                catch (e) {
                    console.error('PiP failed', e);
                }
            })();
        `;
        
        tab.contentView.webContents.executeJavaScript(script).catch(err => console.error('PiP execution failed:', err));
    }

    startAutoHibernationChecker() {
        this.autoHibernationInterval = setInterval(() => {
            this.checkAutoHibernation();
        }, 10000); // check every 10 seconds

        this.mainWindow.on('closed', () => {
            if (this.autoHibernationInterval) {
                clearInterval(this.autoHibernationInterval);
            }
        });
    }

    async checkAutoHibernation() {
        if (this.closeAfter === -1) return;

        const now = Date.now();
        const closeAfterMs = this.closeAfter * 60 * 1000;

        const candidates = this.tabs.map((tab, index) => ({ tab, originalIndex: index }))
            .filter(({ tab, originalIndex }) => {
                if (originalIndex === this.currentIndex) return false;
                if (!tab.isActive || !tab.contentView) return false;
                if (tab.keepActive) return false;
                return true;
            });

        for (const { tab } of candidates) {
            if (!this.tabs.includes(tab)) continue;
            if (this.tabs.indexOf(tab) === this.currentIndex) continue;
            if (!tab.isActive || !tab.contentView) continue;

            let isVideoPlaying = false;
            if (isLiveWebContents(tab.contentView)) {
                try {
                    if (tab.contentView.webContents.isCurrentlyAudible()) {
                        isVideoPlaying = true;
                    } else {
                        isVideoPlaying = await tab.contentView.webContents.executeJavaScript(`
                            (() => {
                                const videos = Array.from(document.querySelectorAll('video'));
                                return videos.some(v => !v.paused && !v.ended && v.readyState >= 3);
                            })()
                        `).catch(() => false);
                    }
                } 
                
                catch (err) {
                    console.error('Failed to check if video is playing in tab:', err);
                }
            }

            if (isVideoPlaying) {
                tab.lastActiveAt = now;
                continue;
            }

            const inactiveDuration = now - tab.lastActiveAt;
            if (inactiveDuration >= closeAfterMs) {
                const index = this.tabs.indexOf(tab);
                if (index !== -1) {
                    this.sleep(index);
                }
            }
        }
    }

    decodeHtmlEntities(str) {
        if (!str) return '';
        return str
            .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
            .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&copy;/g, '©')
            .replace(/&reg;/g, '®');
    }

    setInactiveTabTitle(tab, address, redirectCount = 0) {
        if (redirectCount > 5) return;
        if (!address || !address.startsWith('http')) return;

        try {
            const parsedUrl = new URL(address);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const req = client.get(address, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                },
                timeout: 5000,
            }, (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                  
                let redirectUrl = res.headers.location;
                
                    if (!redirectUrl.startsWith('http')) {
                        redirectUrl = new URL(redirectUrl, address).href;
                    }
                    this.setInactiveTabTitle(tab, redirectUrl, redirectCount + 1);
                    return;
                }

                if (res.statusCode !== 200) {
                    return;
                }

                let data = '';
                res.setEncoding('utf8');

                const processData = (chunk) => {
                    data += chunk;
                    const titleMatch = data.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                    if (titleMatch) {
                        req.destroy();

                        if (this.tabs.includes(tab) && !tab.contentView) {
                            tab.title = this.decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ').trim());
                            this.sendTabData(true);
                        }
                    }
                };

                res.on('data', processData);
                res.on('end', () => {
                  const titleMatch = data.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                  
                  if (titleMatch && this.tabs.includes(tab) && !tab.contentView) {
                        tab.title = this.decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ').trim());
                        this.sendTabData(true);
                  }
                });
            });

            req.on('error', () => {});
            req.on('timeout', () => {
                req.destroy();
            });
        }
        catch (e) {
          console.error("Problem with loading opened tab name: ", e);
        }
    }

    zoomIn(index = this.currentIndex) {
        const tab = this.tabs[index];
        if (tab && tab.contentView && isLiveWebContents(tab.contentView)) {
            const wc = tab.contentView.webContents;
            wc.setZoomLevel(wc.getZoomLevel() + 0.5);
        }
    }

    zoomOut(index = this.currentIndex) {
        const tab = this.tabs[index];
        if (tab && tab.contentView && isLiveWebContents(tab.contentView)) {
            const wc = tab.contentView.webContents;
            wc.setZoomLevel(wc.getZoomLevel() - 0.5);
        }
    }

    resetZoom(index = this.currentIndex) {
        const tab = this.tabs[index];
        if (tab && tab.contentView && isLiveWebContents(tab.contentView)) {
            tab.contentView.webContents.setZoomLevel(0);
        }
    }

    toggleDevTools(index = this.currentIndex) {
        const tab = this.tabs[index];
        if (tab && tab.contentView && isLiveWebContents(tab.contentView)) {
            tab.contentView.webContents.toggleDevTools();
        }
    }

}

Object.assign(TabManager.prototype, TabStacking);
Object.assign(TabManager.prototype, TabContextMenu);
Object.assign(TabManager.prototype, TabConfig);



module.exports = TabManager;
