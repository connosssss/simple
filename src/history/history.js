const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const HISTORY_PATH = path.join(app.getPath('userData'), 'history.json');

const history = [];

const load = () => {

    try {
        if (fs.existsSync(HISTORY_PATH)) {

            const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
            if (Array.isArray(data)) {
                setHistory(data);
            }

        }
    }

    catch (e) {
        console.error("Error loading history:", e);
    }
};

const save = () => {

    try {
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history));
    }

    catch (e) {
        console.error("Error saving history:", e);
    }
};

const setHistory = (newHistory) => {
    history.length = 0;
    history.push(...newHistory);
};

load();

module.exports = {
    history,

    add(url, title, iconURL) {
        if (!url || url.startsWith('about:') || url === 'about:blank') return null;

        const entry = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            url,
            title: title || url,
            iconURL: iconURL || "",
            visitedAt: Date.now()
        };

        history.push(entry);
        save();
        return entry;
    },

    updateLastEntryTitleAndIcon(url, title, iconURL) {
        if (history.length > 0) {
            const last = history[history.length - 1];
            if (last.url === url) {
                let updated = false;
                if (title && title !== url && last.title !== title) {
                    last.title = title;
                    updated = true;
                }
                if (iconURL && last.iconURL !== iconURL) {
                    last.iconURL = iconURL;
                    updated = true;
                }
                if (updated) {
                    save();
                }
            }
        }
    },

    remove(id) {
        const index = history.findIndex(item => item.id === id);
        if (index !== -1) {
            history.splice(index, 1);
            save();
        }
    },

    clear() {
        history.length = 0;
        save();
    },

    getAll() {
        return [...history];
    }
};
