// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts



const { contextBridge, ipcRenderer } = require('electron/renderer')



contextBridge.exposeInMainWorld("electronAPI", {

    createTab: (options) => ipcRenderer.send("createTab", options),
    switchTab: (index) => ipcRenderer.send("switchTab", index),
    onUpdateTabs: (callback) => ipcRenderer.on('updateTabs', (event, tabs, tabTree) => callback(tabs, tabTree)),
    closeTab: (index) => ipcRenderer.send("closeTab", index),
    reorderTabs: (fromIndex, toIndex) => ipcRenderer.send("reorderTabs", fromIndex, toIndex),

    search: (address) => ipcRenderer.send("search", address),
    toolbarAction: (action) => ipcRenderer.send("tBAction", action),
    bookmark: (action) => ipcRenderer.send("bookmark", action),
    openBookmark: (url) => ipcRenderer.send("openBookmark", url),
    getBookmarks: () => ipcRenderer.invoke("getBookmarks"),
    removeBookmark: (url) => ipcRenderer.invoke("removeBookmark", url),
    updateBookmark: (url, updates) => ipcRenderer.invoke("updateBookmark", url, updates),
    showBookmarkFolderMenu: (vars) => ipcRenderer.send("showBookmarkFolderMenu", vars),
    onUpdateBookmarks: (callback) => ipcRenderer.on("updateBookmarks", (event, bookmarks) => callback(bookmarks)),



    searchInPage: (phrase, options) => ipcRenderer.send("searchInPage", phrase, options),
    onToggleFindBar: (callback) => ipcRenderer.on('toggleFindBar', callback),
    stopFindInPage: () => ipcRenderer.send("stopFindInPage"),
    focusUI: () => ipcRenderer.send("focusUI"),


    showContextMenu: (vars) => ipcRenderer.send("showContextMenu", vars),
    showSettingsMenu: (vars) => ipcRenderer.send("showSettingsMenu"),
    hibernateTab: (index) => ipcRenderer.send("hibernateTab", index),
    hibernateStack: (stackId) => ipcRenderer.send("hibernateStack", stackId),
    updateDefaultSite: (site) => ipcRenderer.send("updateDefaultSite", site),
    updateSearchEngine: (engine) => ipcRenderer.send("updateSearchEngine", engine),
    updateCloseAfter: (closeAfter) => ipcRenderer.send("updateCloseAfter", closeAfter),
    updateUiPosition: (position) => ipcRenderer.send("updateUiPosition", position),
    updateShowBookmarkBar: (enabled) => ipcRenderer.send("updateShowBookmarkBar", enabled),
    getSettings: () => ipcRenderer.invoke("getSettings"),
    onInitSettings: (callback) => ipcRenderer.on('initSettings', (event, settings) => callback(settings)),
    onSettingsUpdated: (callback) => ipcRenderer.on("settingsUpdated", (event, settings) => callback(settings)),
    broadcastThemeUpdate: () => ipcRenderer.send("broadcastThemeUpdate"),
    onThemeUpdated: (callback) => ipcRenderer.on("themeUpdated", callback),
    saveThemeToFile: (themeData) => ipcRenderer.invoke("saveThemeToFile", themeData),
    loadThemeFromFile: () => ipcRenderer.invoke("loadThemeFromFile"),

    tabPopOff: (tabIndex) => ipcRenderer.send("tabPopOff", { tabIndex }),
    tabTransfer: (tabIndex, screenX, screenY) => ipcRenderer.send("tabTransfer", { tabIndex, screenX, screenY }),

    getCookies: () => ipcRenderer.invoke("getCookies"),
    deleteCookie: (url, name) => ipcRenderer.invoke("deleteCookie", url, name),
    deleteCookiesByDomain: (domain) => ipcRenderer.invoke("deleteCookiesByDomain", domain),
    clearAllCookies: () => ipcRenderer.invoke("clearAllCookies"),
    clearThirdPartyCookies: () => ipcRenderer.invoke("clearThirdPartyCookies"),
    setBlockTrackers: (enabled) => ipcRenderer.send("setBlockTrackers", enabled),

    createStack: (tabIndices, parentStackIds) => ipcRenderer.send("createStack", tabIndices, parentStackIds),
    updateStack: (stackIds, tabIndex) => ipcRenderer.send("updateStack", stackIds, tabIndex),
    deleteStack: (stackId) => ipcRenderer.send("deleteStack", stackId),
    closeStack: (stackId) => ipcRenderer.send("closeStack", stackId),
    removeFromStack: (tabIndex, depth) => ipcRenderer.send("removeFromStack", tabIndex, depth),
    showStackContextMenu: (vars) => ipcRenderer.send("showStackContextMenu", vars),
    renameStack: (stackId, name) => ipcRenderer.send("renameStack", stackId, name),
    reorderStack: (stackId, toIndex) => ipcRenderer.send("reorderStack", stackId, toIndex),
    moveStack: (dragStackId, targetStackIds) => ipcRenderer.send("moveStack", dragStackId, targetStackIds),
    moveStackToTab: (dragStackId, targetTabIndex, parentStackIds) => ipcRenderer.send("moveStackToTab", dragStackId, targetTabIndex, parentStackIds),
    onPromptStackName: (callback) => ipcRenderer.on('promptStackName', (event, data) => callback(data)),
    stackBarsVisible: (count) => ipcRenderer.send("stackBarsVisible", count),
    bookmarkBarVisible: (visible) => ipcRenderer.send("bookmarkBarVisible", visible),

    // Extensions
    getExtensions: () => ipcRenderer.invoke('getExtensions'),
    installExtension: (url) => ipcRenderer.invoke('installExtension', url),
    removeExtension: (extensionId) => ipcRenderer.invoke('removeExtension', extensionId),
    showExtensionsMenu: (bounds) => ipcRenderer.send('showExtensionsMenu', bounds),

    // History
    getHistory: () => ipcRenderer.invoke("getHistory"),
    deleteHistoryItem: (id) => ipcRenderer.invoke("deleteHistoryItem", id),
    clearHistory: () => ipcRenderer.invoke("clearHistory"),
    onUpdateHistory: (callback) => ipcRenderer.on("updateHistory", (event, history) => callback(history)),
    setDropdownVisible: (visible) => ipcRenderer.send("setDropdownVisible", visible),

    // Downloads
    getDownloads: () => ipcRenderer.invoke("getDownloads"),
    pauseDownload: (id) => ipcRenderer.send("pauseDownload", id),
    resumeDownload: (id) => ipcRenderer.send("resumeDownload", id),
    cancelDownload: (id) => ipcRenderer.send("cancelDownload", id),
    removeDownload: (id) => ipcRenderer.send("removeDownload", id),
    showInFolder: (id) => ipcRenderer.send("showInFolder", id),
    openDownloadedFile: (id) => ipcRenderer.send("openDownloadedFile", id),
    setDownloadsDropdownVisible: (visible) => ipcRenderer.send("setDownloadsDropdownVisible", visible),
    onDownloadStarted: (callback) => ipcRenderer.on("download-started", (event, data) => callback(data)),
    onDownloadUpdated: (callback) => ipcRenderer.on("download-updated", (event, data) => callback(data)),
    onDownloadDone: (callback) => ipcRenderer.on("download-done", (event, data) => callback(data)),
    onDownloadRemoved: (callback) => ipcRenderer.on("download-removed", (event, data) => callback(data)),

    //Passwords
    getAllPasswords: () => ipcRenderer.invoke("passwords:get-all"),
    deletePassword: (id) => ipcRenderer.invoke("passwords:delete", id),
    
    savePassword: (origin, username, password) => ipcRenderer.invoke("passwords:save", origin, username, password),
    neverSavePassword: (origin) => ipcRenderer.invoke("passwords:never-save", origin),
    
    getPasswordSettings: () => ipcRenderer.invoke("passwords:get-settings"),
    setOfferToSavePasswords: (enabled) => ipcRenderer.invoke("passwords:set-offer-save", enabled),
    onShowPasswordPrompt: (callback) => ipcRenderer.on("show-password-prompt", (event, data) => callback(data)),
    setPasswordPromptVisible: (visible) => ipcRenderer.send("setPasswordPromptVisible", visible),
})
