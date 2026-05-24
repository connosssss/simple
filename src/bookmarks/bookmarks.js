const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const BOOKMARKS_PATH = path.join(app.getPath('userData'), 'bookmarks.json');

let bookmarks = [];

const load = () => {
    try {
        if (fs.existsSync(BOOKMARKS_PATH)) {
            bookmarks = JSON.parse(fs.readFileSync(BOOKMARKS_PATH, 'utf-8'));
        }
    } 
    
    catch (e) {
        console.error("Error loading bookmarks:", e);
        bookmarks = [];
    }
};

const save = () => {
    try {
        fs.writeFileSync(BOOKMARKS_PATH, JSON.stringify(bookmarks));
        console.log(bookmarks);
    } 
    
    catch (e) {
        console.error("Error saving bookmarks:", e);
    }
};




load();

module.exports = {

    add(url, title, iconURL) {
        if (bookmarks.some(b => b.url === url)) return;

        

        bookmarks.push({ url, title: title || url, iconURL: iconURL || "", createdAt: Date.now() });
        save();
    },

    remove(url) {
        bookmarks = bookmarks.filter(b => b.url !== url);
        save();
    },

    isBookmarked(url) {
        return bookmarks.some(b => b.url === url);
    },

    getAll() {
        return [...bookmarks];
    }
};
