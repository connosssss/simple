const fs = require('fs');
const { writeJsonAtomic } = require('../utils/fileIO');

const SAVE_DELAY_MS = 150;

module.exports = {

    getSettingsPayload() {
        return {
            defaultSite: this.defaultSite,
            searchEngine: this.searchEngine,
            showBookmarkBar: this.showBookmarkBar,
            closeAfter: this.closeAfter,
            uiPosition: this.uiPosition || 'top'
        };
    },

    getSettingsTabs() {
        return this.tabs.filter(tab => tab.isSettingsTab && tab.contentView 
            && tab.contentView.webContents && !tab.contentView.webContents.isDestroyed());
    },

    broadcastSettings() {
        const settingsPayload = this.getSettingsPayload();

        this.getSettingsTabs().forEach(tab => {
            tab.contentView.webContents.send("initSettings", settingsPayload);
        });

        if (this.ui?.webContents && !this.ui.webContents.isDestroyed()) {
            this.ui.webContents.send("settingsUpdated", settingsPayload);
        }
    },

    updateDefaultSite(site) {
        this.defaultSite = site;
        this.saveConfig(true);
        this.broadcastSettings();
    },

    updateSearchEngine(engine) {
        this.searchEngine = engine;
        this.saveConfig(true);
        this.broadcastSettings();
    },

    updateCloseAfter(closeAfter) {
        this.closeAfter = parseInt(closeAfter, 10);
        this.saveConfig(true);
        this.broadcastSettings();
    },

    updateUiPosition(position) {
        this.uiPosition = position || 'top';
        this.saveConfig(true);
        this.broadcastSettings();
        this.resizeWindow();
    },


    serializeConfig() {
        const savedTabs = this.tabs.filter(tab => !(tab.isSettingsTab)).map(tab => ({
            id: tab.id,
            address: tab.address,
            title: tab.title,
            isStacked: tab.isStacked,
            stackId: tab.stackId,
            stackIds: tab.stackIds || []
        }));

        const lastVisitedTabIds = {};
        if (this.tabTree) {
            this.tabTree.root.traverse(node => {
                if (node.type === 'stack' && node.value?.lastVisitedTabId) {
                    lastVisitedTabIds[node.id] = node.value.lastVisitedTabId;
                }
            });
        }

        return {
            defaultSite: this.defaultSite,
            searchEngine: this.searchEngine,
            showBookmarkBar: this.showBookmarkBar,
            closeAfter: this.closeAfter,
            uiPosition: this.uiPosition || 'top',
            tabs: savedTabs,
            stackNames: this.stackNames,
            nextStackNumber: this.nextStackNumber,
            activeTabId: this.tabs[this.currentIndex]?.id || null,
            lastVisitedTabIds
        };
    },

    queueConfigSave() {
        if (this.isLoading) return;

        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            try {
                writeJsonAtomic(this.configPath, this.serializeConfig());
            }
            catch (error) {
                console.error("Error saving config:", error);
            }
        }, SAVE_DELAY_MS);
    },

    saveConfig(force = false) {
        if (force) {
            this.flushConfigSave();
        } else {
            this.queueConfigSave();
        }
    },

    flushConfigSave() {
        if (this.isLoading) return;
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
        try {
            writeJsonAtomic(this.configPath, this.serializeConfig());
        }
        catch (error) {
            console.error("Error flushing config save:", error);
        }
    },

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                this.isLoading = true;

                const data = fs.readFileSync(this.configPath);
                const config = JSON.parse(data);

                if (config.defaultSite) {
                    this.defaultSite = config.defaultSite;
                }

                if (config.searchEngine) {
                    this.searchEngine = config.searchEngine;
                }

                if (typeof config.showBookmarkBar === "boolean") {
                    this.showBookmarkBar = config.showBookmarkBar;
                }

                if (config.closeAfter !== undefined) {
                    this.closeAfter = parseInt(config.closeAfter, 10);
                }

                if (config.uiPosition) {
                    this.uiPosition = config.uiPosition;
                } else {
                    this.uiPosition = 'top';
                }

                if (config.stackNames) {
                    this.stackNames = config.stackNames;
                }

                if (config.nextStackNumber) {
                    this.nextStackNumber = config.nextStackNumber;
                }

                if (config.tabs && Array.isArray(config.tabs)) {
                    config.tabs.forEach(tabData => {
                        this.createTab({
                            id: tabData.id || null,
                            address: tabData.address,
                            switchTo: false,
                            isStacked: tabData.isStacked || false,
                            stackId: tabData.stackId || null,
                            stackIds: tabData.stackIds || []
                        });
                    });

                    if (config.lastVisitedTabIds && this.tabTree) {
                        for (const [stackId, tabId] of Object.entries(config.lastVisitedTabIds)) {
                            this.tabTree.setStackLastVisitedTab(stackId, tabId);
                        }
                    }

                    let activeIndex = -1;
                    if (config.activeTabId) {
                        activeIndex = this.tabs.findIndex(t => t.id === config.activeTabId);
                    }
                    if (activeIndex === -1 && this.tabs.length > 0) {
                        activeIndex = this.tabs.length - 1;
                    }

                    if (activeIndex >= 0) {
                        this.switchTab(activeIndex);
                    }
                }

                this.isLoading = false;
            }
        } 
        
        catch (error) {
            console.error("Error loading config:", error);
            this.isLoading = false;
        }
    },

};
