const crypto = require('crypto');

class Tab {
    constructor(overrides = {}) {
        Object.assign(this, {
            id: crypto.randomUUID(),
            contentView: null,
            address: '',
            title: '',
            isActive: true,
            iconURL: '',
            isStacked: false,
            stackId: null,
            stackIds: [],
            lastActiveAt: Date.now(),
            keepActive: false,
            isSettingsTab: false,
            isLoading: false,
            lifecycleCleanup: null,
            contextMenuHandler: null,
            isNewTab: false
        }, overrides);
    }
}

class TreeNode {
    constructor(type, id = crypto.randomUUID(), value = null) {
        this.type = type;
        this.id = id;
        this.value = value;
        this.parent = null;
        this.children = [];
    }

    appendChild(node) {
        if (!node) return null;
        node.detach();
        node.parent = this;
        this.children.push(node);
        return node;
    }

    detach() {
        if (!this.parent) return;

        const siblings = this.parent.children;
        const index = siblings.indexOf(this);
        if (index !== -1) {
            siblings.splice(index, 1);
        }
        this.parent = null;
    }

    find(func) {
        if (func(this)) return this;

        for (const child of this.children) {
            const match = child.find(func);
            if (match) return match;
        }

        return null;
    }

    traverse(callback) {
        callback(this);
        this.children.forEach(child => child.traverse(callback));
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            value: this.value,
            children: this.children.map(child => child.toJSON())
        };
    }
}

class TabNode extends TreeNode {
    constructor(tab) {
        super('tab', tab.id || (tab.id = crypto.randomUUID()), tab);
    }

    get tab() {
        return this.value;
    }

    toJSON() {
        const tab = this.tab || {};

        return {
            type: this.type,
            id: this.id,
            value: {
                id: tab.id || this.id,
                title: tab.title || '',
                address: tab.address || '',
                stackIds: tab.stackIds || [],
                isActive: Boolean(tab.isActive),
                isSettingsTab: Boolean(tab.isSettingsTab),
                isNewTab: Boolean(tab.isNewTab),
                isLoading: Boolean(tab.isLoading)
            },
            children: []
        };
    }
}

class Stack extends TreeNode {
    constructor(id = crypto.randomUUID(), name = null) {
        super('stack', id, { name });
    }

    get name() {
        return this.value?.name || null;
    }

    set name(nextName) {
        this.value = { ...(this.value || {}), name: nextName || null };
    }

    getTabs() {
        const tabs = [];
        this.traverse((node) => {
            if (node instanceof TabNode) {
                tabs.push(node.tab);
            }
        });
        return tabs;
    }

    getStackPath() {
        const path = [];
        let node = this;

        while (node && node.type !== 'root') {
            if (node instanceof Stack) {
                path.unshift(node.id);
            }
            node = node.parent;
        }

        return path;
    }
}

class AddressBarState extends TreeNode {
    constructor() {
        super('addressBar', 'address-bar', {
            currentAddress: '',
            dropdownVisible: false,
            downloadsDropdownVisible: false
        });
    }

    setAddress(address) {
        this.value.currentAddress = address || '';
    }

    setDropdownVisible(visible) {
        this.value.dropdownVisible = Boolean(visible);
    }

    setDownloadsDropdownVisible(visible) {
        this.value.downloadsDropdownVisible = Boolean(visible);
    }
}

class Tree {
    constructor() {
        this.root = new TreeNode('root', 'browser-root');
        this.addressBar = new AddressBarState();
        this.root.appendChild(this.addressBar);
        this.tabRoot = new TreeNode('tabs', 'tabs-root');
        this.root.appendChild(this.tabRoot);
    }

    rebuildFromTabs(tabs, stackNames = {}) {
        this.tabRoot.children = [];

        for (const tab of tabs) {
            this.addTab(tab, tab.stackIds || [], stackNames);
        }
    }

    addTab(tab, stackIds = [], stackNames = {}) {
        const cleanStackIds = Array.isArray(stackIds) ? stackIds.filter(Boolean) : [];
        let parent = this.tabRoot;

        for (const stackId of cleanStackIds) {
            let stack = parent.children.find(child => child instanceof Stack && child.id === stackId);
            if (!stack) {
                stack = new Stack(stackId, stackNames[stackId] || null);
                parent.appendChild(stack);
            } else {
                stack.name = stackNames[stackId] || stack.name;
            }
            parent = stack;
        }

        parent.appendChild(new TabNode(tab));
    }

    findStack(stackId) {
        return this.root.find(node => node instanceof Stack && node.id === stackId);
    }

    getTabsInStack(stackId) {
        const stack = this.findStack(stackId);
        return stack ? stack.getTabs() : [];
    }

    getStackPath(stackId) {
        const stack = this.findStack(stackId);
        return stack ? stack.getStackPath() : [];
    }

    getStackNames() {
        const names = {};
        this.root.traverse((node) => {
            if (node instanceof Stack && node.name) {
                names[node.id] = node.name;
            }
        });
        return names;
    }

    toJSON() {
        return this.root.toJSON();
    }
}

module.exports = {
    AddressBarState,
    Tab,
    Tree,
    TabNode,
    Stack,
    TreeNode
};
