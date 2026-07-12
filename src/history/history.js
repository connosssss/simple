const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const HISTORY_PATH = path.join(app.getPath('userData'), 'history.jsonl');
const OLD_HISTORY_PATH = path.join(app.getPath('userData'), 'history.json');

const history = [];
let pendingEntry = null;

const commitPendingEntry = () => {
    if (pendingEntry) {
        try {
            fs.appendFileSync(HISTORY_PATH, JSON.stringify(pendingEntry) + '\n', 'utf-8');
        } catch (e) {
            console.error("Error appending to history:", e);
        }
        pendingEntry = null;
    }
};

const saveAll = () => {
    try {
        const tempPath = HISTORY_PATH + '.tmp';
        const content = history.map(entry => JSON.stringify(entry)).join('\n') + (history.length > 0 ? '\n' : '');
        fs.writeFileSync(tempPath, content, 'utf-8');
        fs.renameSync(tempPath, HISTORY_PATH);
    } catch (e) {
        console.error("Error rewriting history:", e);
    }
};

const load = () => {
    try {
        if (fs.existsSync(OLD_HISTORY_PATH)) {
            try {
                const oldContent = fs.readFileSync(OLD_HISTORY_PATH, 'utf-8').trim();
                if (oldContent.startsWith('[')) {
                    const data = JSON.parse(oldContent);
                    if (Array.isArray(data)) {
                        history.push(...data);
                    }
                }
            }
          
            catch (e) {
                console.error("Error migrating old history:", e);
            }
          
          saveAll();
          
            try {
                fs.unlinkSync(OLD_HISTORY_PATH);
            }

            catch (e) {
                console.error("Error deleting old history file:", e);
            }
            return;
        }

        if (fs.existsSync(HISTORY_PATH)) {
            const fileContent = fs.readFileSync(HISTORY_PATH, 'utf-8');
          const lines = fileContent.split('\n');
          
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    try {
                        history.push(JSON.parse(trimmed));
                    }
                    catch (e) {
                        console.error("Failed to parse history line:", e);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error loading history:", e);
    }
};

load();

module.exports = {
    history,

    add(url, title, iconURL) {
        if (!url || url.startsWith('about:') || url === 'about:blank') return null;

        commitPendingEntry();

        const entry = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            url,
            title: title || url,
            iconURL: iconURL || "",
            visitedAt: Date.now()
        };

        history.push(entry);
        pendingEntry = entry;
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
            }
        }
    },

    remove(id) {
        if (pendingEntry && pendingEntry.id === id) {
            pendingEntry = null;
        }
        const index = history.findIndex(item => item.id === id);
        if (index !== -1) {
            history.splice(index, 1);
            saveAll();
        }
    },

    clear() {
        pendingEntry = null;
        history.length = 0;
        try {
            if (fs.existsSync(HISTORY_PATH)) {
                fs.truncateSync(HISTORY_PATH, 0);
            }
        }

        catch (e) {
            console.error("Error clearing history file:", e);
        }
    },

    flush() {
        commitPendingEntry();
    },

    getAll() {
        return [...history];
    }
};
