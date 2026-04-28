const fs = require('fs');

module.exports = {

    setSettingsUI(view) {
        this.settingsUI = view;

        if (this.settingsUI && !this.settingsUI.webContents.isDestroyed()) {

            this.settingsUI.webContents.once('did-finish-load', () => {
                
                this.settingsUI.webContents.send("initSettings", { defaultSite: this.defaultSite, searchEngine: this.searchEngine });
                this.sendTabData();
            });
        }

    },

    updateDefaultSite(site) {
        this.defaultSite = site;

        this.saveConfig();
        if (this.settingsUI && !this.settingsUI.webContents.isDestroyed()) {

            this.settingsUI.webContents.send("initSettings", { defaultSite: this.defaultSite, searchEngine: this.searchEngine });

        }},

    updateSearchEngine(engine) {
        this.searchEngine = engine;
        this.saveConfig();
        if (this.settingsUI && !this.settingsUI.webContents.isDestroyed()) {
            this.settingsUI.webContents.send("initSettings", { defaultSite: this.defaultSite, searchEngine: this.searchEngine });
        }},



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

    saveConfig() {
        if (this.isLoading) return;


        try {                                         // may need to do this with a lot more tabs, might be better to make a single bool in the future
            const savedTabs = this.tabs.filter(tab => !(tab.isSettingsTab)).map(tab => ({
                address: tab.address,
                title: tab.title,
                isStacked: tab.isStacked,
                stackId: tab.stackId,
            }));

            const config = {
                defaultSite: this.defaultSite,
                searchEngine: this.searchEngine,
                tabs: savedTabs,
                stackNames: this.stackNames,
                nextStackNumber: this.nextStackNumber,
            };

            fs.writeFileSync(this.configPath, JSON.stringify(config));
        } 
        
        catch (error) {
            console.error("Error saving: ", error);
        }
    },

};
