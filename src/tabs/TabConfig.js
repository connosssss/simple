const fs = require('fs');

const SAVE_DELAY_MS = 150;

module.exports = {

    getSettingsPayload() {
        return {
            defaultSite: this.defaultSite,
            searchEngine: this.searchEngine,
            showBookmarkBar: this.showBookmarkBar,
            closeAfter: this.closeAfter
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
        this.queueConfigSave();
        this.broadcastSettings();
    },

    updateSearchEngine(engine) {
        this.searchEngine = engine;
        this.queueConfigSave();
        this.broadcastSettings();
    },

    updateCloseAfter(closeAfter) {
        this.closeAfter = parseInt(closeAfter, 10);
        this.queueConfigSave();
        this.broadcastSettings();
    },


    serializeConfig() {
        const savedTabs = this.tabs.filter(tab => !(tab.isSettingsTab)).map(tab => ({
            address: tab.address,
            title: tab.title,
            isStacked: tab.isStacked,
            stackId: tab.stackId,
        }));

        return {
            defaultSite: this.defaultSite,
            searchEngine: this.searchEngine,
            showBookmarkBar: this.showBookmarkBar,
            closeAfter: this.closeAfter,
            tabs: savedTabs,
            stackNames: this.stackNames,
            nextStackNumber: this.nextStackNumber,
        };
    },

    queueConfigSave() {
        if (this.isLoading) return;

        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            try {
                fs.writeFileSync(this.configPath, JSON.stringify(this.serializeConfig()));
            } catch (error) {
                console.error("Error saving config:", error);
            }
        }, SAVE_DELAY_MS);
    },

    saveConfig() {
        this.queueConfigSave();
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

                if (config.stackNames) {
                    this.stackNames = config.stackNames;
                }

                if (config.nextStackNumber) {
                    this.nextStackNumber = config.nextStackNumber;
                }

                if (config.tabs && Array.isArray(config.tabs)) {
                    config.tabs.forEach(tabData => {
                        this.createTab(tabData.address, false, 
                            tabData.isStacked || false,
                            tabData.stackId || null
                        );
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
    },

};
