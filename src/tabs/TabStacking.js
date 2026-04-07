const crypto = require('crypto');

module.exports = {

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
                    }
                }
                this.tabs[index].isStacked = true;
                this.tabs[index].stackId = stackId;
            }
        });

        this.sendTabData();


    },

    updateStack(stackId, tabIndex) {
        if (this.tabs[tabIndex]){
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
                }
            }
            this.tabs[tabIndex].stackId = stackId;
             this.tabs[tabIndex].isStacked = true;
        }

        this.sendTabData();
    },

    removeFromStack(tabIndex) {

        if(this.tabs[tabIndex]){
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
        this.sendTabData();

    },

    renameStack(stackId, name) {
        if (name && name.trim()) {
            this.stackNames[stackId] = name.trim();
        } else {
            delete this.stackNames[stackId];
        }
        this.sendTabData();
    },

};
