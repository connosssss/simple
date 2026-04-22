const crypto = require('crypto');

module.exports = {

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
            if (this.tabs[index]) {
                const oldStackId = this.tabs[index].stackId;
                if (oldStackId) {
                    const remaining = this.tabs.filter(
                        t => t.stackId === oldStackId && t !== this.tabs[index]
                    );
                    if (remaining.length < 2) {
                        remaining.forEach(t => {
                            t.isStacked = false;
                            t.stackId = null;
                        });
                        delete this.stackNames[oldStackId];
                        this.recalculateStackNumber();
                    }
                }
                this.tabs[index].isStacked = true;
                this.tabs[index].stackId = stackId;
            }
        });

        this.stackNames[stackId] = `Stack ${this.nextStackNumber}`;
        this.nextStackNumber++;

        this.sendTabData();


    },

    updateStack(stackId, tabIndex) {
        if (this.tabs[tabIndex]) {
            const oldStackId = this.tabs[tabIndex].stackId;
            if (oldStackId && oldStackId !== stackId) {
                const remaining = this.tabs.filter(
                    t => t.stackId === oldStackId && t !== this.tabs[tabIndex]
                );
                if (remaining.length < 2) {
                    remaining.forEach(t => {
                        t.isStacked = false;
                        t.stackId = null;
                    });
                    delete this.stackNames[oldStackId];
                    this.recalculateStackNumber();
                }
            }
            this.tabs[tabIndex].stackId = stackId;
            this.tabs[tabIndex].isStacked = true;
        }

        this.sendTabData();
    },

    removeFromStack(tabIndex) {

        if (this.tabs[tabIndex]) {
            const oldStackId = this.tabs[tabIndex].stackId;

            this.tabs[tabIndex].isStacked = false;
            this.tabs[tabIndex].stackId = null;

            if (oldStackId) {
                const remaining = this.tabs.filter(t => t.stackId === oldStackId);
                if (remaining.length < 2) {
                    remaining.forEach(t => {
                        t.isStacked = false;
                        t.stackId = null;
                    });
                    delete this.stackNames[oldStackId];
                    this.recalculateStackNumber();
                }
            }


        }
        this.sendTabData();
    },


    deleteStack(stackId) {
        this.tabs.forEach(tab => {
            if (tab.stackId === stackId) {
                tab.isStacked = false;
                tab.stackId = null;
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
