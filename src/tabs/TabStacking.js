const crypto = require('crypto');

module.exports = {

    clearStackState(tab) {
        if (!tab) return;
        tab.isStacked = false;
        tab.stackId = null;
    },

    cleanupStack(stackId, excludedTab = null) {
        if (!stackId) return;

        const remainingTabs = this.tabs.filter(tab => tab.stackId === stackId && tab !== excludedTab);
        if (remainingTabs.length >= 2) return;

        remainingTabs.forEach(tab => this.clearStackState(tab));
        delete this.stackNames[stackId];
        this.recalculateStackNumber();
    },

    recalculateStackNumber() {
        let max = 0;

        for (const name of Object.values(this.stackNames)) {
            if (name) {
                const match = name.match(/^Stack (\d+)$/);

                if (match) {
                    const num = parseInt(match[1]);
                    if (num > max) max = num;
                }
            }
        }

        this.nextStackNumber = max + 1;
    },

    createStack(tabIndices) {
        const stackId = crypto.randomUUID();

        tabIndices.forEach(index => {
            const tab = this.tabs[index];
            if (!tab) return;

            this.cleanupStack(tab.stackId, tab);
            tab.isStacked = true;
            tab.stackId = stackId;
        });

        this.stackNames[stackId] = `Stack ${this.nextStackNumber}`;
        this.nextStackNumber++;

        this.sendTabData();
    },

    updateStack(stackId, tabIndex) {
        const tab = this.tabs[tabIndex];
        if (!tab) return;

        if (tab.stackId && tab.stackId !== stackId) {
            this.cleanupStack(tab.stackId, tab);
        }

        tab.stackId = stackId;
        tab.isStacked = true;
        this.sendTabData();
    },

    removeFromStack(tabIndex) {
        const tab = this.tabs[tabIndex];
        if (!tab) return;

        const oldStackId = tab.stackId;
        this.clearStackState(tab);
        this.cleanupStack(oldStackId);
        this.sendTabData();
    },


    deleteStack(stackId) {
        this.tabs.forEach(tab => {
            if (tab.stackId === stackId) {
                this.clearStackState(tab);
            }

        });

        delete this.stackNames[stackId];
        this.recalculateStackNumber();
        this.sendTabData();

    },

    closeStack(stackId) {
        let tabsToClose = this.tabs.filter(t => t.stackId == stackId);

        for (let i = tabsToClose.length - 1; i >= 0; i--) {

            const index = this.tabs.indexOf(tabsToClose[i]);
            if (index != -1) {
                this.closeTab(index);
            }
        }
    },

    renameStack(stackId, name) {
        if (name && name.trim()) {
            this.stackNames[stackId] = name.trim();
        } else {
            delete this.stackNames[stackId];
            this.recalculateStackNumber();
        }
        this.sendTabData();
    },

};
