const crypto = require('crypto');

module.exports = {

    clearStackState(tab) {
        if (!tab) return;
        tab.isStacked = false;
        tab.stackId = null;
        tab.stackIds = [];
    },

    cleanupStack(stackId, excludedTab = null) {
        if (!stackId) return;

        const remainingTabs = this.tabs.filter(tab => tab.stackIds && tab.stackIds.includes(stackId) && tab !== excludedTab);


        if (remainingTabs.length >= 2) return;

        remainingTabs.forEach(tab => {
            if (tab.stackIds) {
                tab.stackIds = tab.stackIds.filter(id => id !== stackId);
                if (tab.stackIds.length === 0) {
                    this.clearStackState(tab);
                } else {
                    tab.stackId = tab.stackIds[0];
                }
            }
            
            else {
                this.clearStackState(tab);
            }
        });
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

    createStack(tabIndices, parentStackIds = []) {
        const stackId = crypto.randomUUID();

        tabIndices.forEach(index => {
            const tab = this.tabs[index];
            if (!tab) return;

            if (tab.stackIds) {
                 const oldIds = [...tab.stackIds];

                 oldIds.forEach(id => {
                     if (!parentStackIds.includes(id)) {
                         this.cleanupStack(id, tab);
                     }
                 });
            }

            tab.isStacked = true;
            tab.stackIds = [...parentStackIds, stackId];
            tab.stackId = tab.stackIds[0];
        });

        this.stackNames[stackId] = `Stack ${this.nextStackNumber}`;
        this.nextStackNumber++;

        this.sendTabData(true);
    },

    updateStack(targetStackIds, tabIndex) {
        if (!Array.isArray(targetStackIds)) {
            targetStackIds = [targetStackIds];
        }

        const tab = this.tabs[tabIndex];
        if (!tab) return;

        if (tab.stackIds) {
            const oldIds = [...tab.stackIds];
            oldIds.forEach(id => {
                if (!targetStackIds.includes(id)) {
                    this.cleanupStack(id, tab);
                }
            });
        }

        tab.stackIds = [...targetStackIds];
        tab.stackId = tab.stackIds[0];
        tab.isStacked = true;
        this.sendTabData(true);
    },

    removeFromStack(tabIndex, depth = null) {
        const tab = this.tabs[tabIndex];
        if (!tab || !tab.stackIds || tab.stackIds.length === 0) return;

        if (depth !== null && depth < tab.stackIds.length) {
            const oldIds = [...tab.stackIds];
            const removedIds = oldIds.slice(depth);
            removedIds.forEach(id => this.cleanupStack(id, tab));
            
            tab.stackIds = oldIds.slice(0, depth);
            if (tab.stackIds.length === 0) {
                this.clearStackState(tab);
            } else {
                tab.stackId = tab.stackIds[0];
            }
        } 
        else {
            const oldStackIds = [...tab.stackIds];
            this.clearStackState(tab);
            oldStackIds.forEach(id => this.cleanupStack(id));
        }

        this.sendTabData(true);
    },


    deleteStack(stackId) {
        this.tabs.forEach(tab => {
            if (tab.stackIds && tab.stackIds.includes(stackId)) {
                const idx = tab.stackIds.indexOf(stackId);
                tab.stackIds = tab.stackIds.slice(0, idx);
                if (tab.stackIds.length === 0) {
                    this.clearStackState(tab);
                } 
                
                else {
                    tab.stackId = tab.stackIds[0];
                }
            }

        });

        delete this.stackNames[stackId];
        this.recalculateStackNumber();
        this.sendTabData(true);

    },

    closeStack(stackId) {
        let tabsToClose = this.tabs.filter(t => t.stackIds && t.stackIds.includes(stackId));

        for (let i = tabsToClose.length - 1; i >= 0; i--) {

            const index = this.tabs.indexOf(tabsToClose[i]);
            if (index != -1) {
                this.closeTab(index);
            }
        }
    },

    hibernateStack(stackId){
        let tabsToHibernate = this.tabs.filter(t => t.stackIds && t.stackIds.includes(stackId));

        for (let i = tabsToHibernate.length - 1; i >= 0; i--) {

            const index = this.tabs.indexOf(tabsToHibernate[i]);
            if (index != -1) {
                this.sleep(index);
            }
        }
    },


    renameStack(stackId, name) {
        if (name && name.trim()) {
            this.stackNames[stackId] = name.trim();
        } 
        
        else {
            delete this.stackNames[stackId];
            this.recalculateStackNumber();
        }
        this.sendTabData(true);
    },

    moveStackIntoStack(dragStackId, targetStackIds) {
        if (!Array.isArray(targetStackIds)) {
            targetStackIds = [targetStackIds];
        }

       
        const tabsToMove = this.tabs.filter(tab => tab.stackIds && tab.stackIds.includes(dragStackId));
        if (tabsToMove.length === 0) return;

        const descendants = new Set();
        tabsToMove.forEach(tab => {
            const idx = tab.stackIds.indexOf(dragStackId);
            if (idx !== -1) {
                tab.stackIds.slice(idx + 1).forEach(id => descendants.add(id));
            }
        });

        if (targetStackIds.some(id => id === dragStackId || descendants.has(id))) {
            return;
        }

        const oldStackIdsToClean = new Set();
      tabsToMove.forEach(tab => {
          
            tab.stackIds.forEach(id => {
                oldStackIdsToClean.add(id);
            });
        });

        tabsToMove.forEach(tab => {
            const idx = tab.stackIds.indexOf(dragStackId);
            if (idx !== -1) {
                const subPath = tab.stackIds.slice(idx);
                tab.stackIds = [...targetStackIds, ...subPath];
                tab.stackId = tab.stackIds[0];
                tab.isStacked = true;
            }
        });

        oldStackIdsToClean.forEach(id => {
            this.cleanupStack(id);
        });

        this.sendTabData(true);
    },

    moveStackToTab(dragStackId, targetTabIndex, parentStackIds = []) {
        const targetTab = this.tabs[targetTabIndex];
        if (!targetTab) return;

        if (targetTab.isStacked) {
            this.moveStackIntoStack(dragStackId, targetTab.stackIds);
        }

        else {
            const tabsToMove = this.tabs.filter(tab => tab.stackIds && tab.stackIds.includes(dragStackId));
          const descendants = new Set();
          
            tabsToMove.forEach(t => {
                const idx = t.stackIds.indexOf(dragStackId);
                if (idx !== -1) {
                    t.stackIds.slice(idx + 1).forEach(id => descendants.add(id));
                }
            });

            if (parentStackIds.some(id => id === dragStackId || descendants.has(id))) {
                return;
            }

            const newStackId = crypto.randomUUID();
            targetTab.isStacked = true;
            targetTab.stackIds = [...parentStackIds, newStackId];
            targetTab.stackId = targetTab.stackIds[0];
            
            
            this.stackNames[newStackId] = `Stack ${this.nextStackNumber}`;
            this.nextStackNumber++;
            
            this.moveStackIntoStack(dragStackId, [...parentStackIds, newStackId]);
        }
    },

};
