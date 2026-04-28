// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts



const { contextBridge, ipcRenderer } = require('electron/renderer')



contextBridge.exposeInMainWorld("electronAPI", {

    createTab: () => ipcRenderer.send("createTab"),
    switchTab: (index) => ipcRenderer.send("switchTab", index),
    onUpdateTabs: (callback) => ipcRenderer.on('updateTabs', (event, tabs) => callback(tabs)),
    closeTab: (index) => ipcRenderer.send("closeTab", index),
    reorderTabs: (fromIndex, toIndex) => ipcRenderer.send("reorderTabs", fromIndex, toIndex),

    search: (address) => ipcRenderer.send("search", address),
    toolbarAction: (action) => ipcRenderer.send("tBAction", action),



    searchInPage: (phrase, options) => ipcRenderer.send("searchInPage", phrase, options),
    onToggleFindBar: (callback) => ipcRenderer.on('toggleFindBar', callback),
    stopFindInPage: () => ipcRenderer.send("stopFindInPage"),
    focusUI: () => ipcRenderer.send("focusUI"),
    

    showContextMenu: (vars) => ipcRenderer.send("showContextMenu", vars),
    showSettingsMenu: (vars) => ipcRenderer.send("showSettingsMenu"),
    hibernateTab: (index) => ipcRenderer.send("hibernateTab", index),
    updateDefaultSite: (site) => ipcRenderer.send("updateDefaultSite", site),
    updateSearchEngine: (engine) => ipcRenderer.send("updateSearchEngine", engine),
    onInitSettings: (callback) => ipcRenderer.on('initSettings', (event, settings) => callback(settings)),
    broadcastThemeUpdate: () => ipcRenderer.send("broadcastThemeUpdate"),
    onThemeUpdated: (callback) => ipcRenderer.on("themeUpdated", callback),


    tabPopOff: (tabIndex) => ipcRenderer.send("tabPopOff", { tabIndex }),
    tabTransfer: (tabIndex, screenX, screenY) => ipcRenderer.send("tabTransfer", {tabIndex, screenX, screenY }),

    getCookies: () => ipcRenderer.invoke("getCookies"),
    deleteCookie: (url, name) => ipcRenderer.invoke("deleteCookie", url, name),
    deleteCookiesByDomain: (domain) => ipcRenderer.invoke("deleteCookiesByDomain", domain),
    clearAllCookies: () => ipcRenderer.invoke("clearAllCookies"),
    clearThirdPartyCookies: () => ipcRenderer.invoke("clearThirdPartyCookies"),
    setBlockTrackers: (enabled) => ipcRenderer.send("setBlockTrackers", enabled),


    createStack: (tabIndices) => ipcRenderer.send("createStack", tabIndices),
    updateStack: (stackId, tabIndex) => ipcRenderer.send("updateStack", stackId, tabIndex),
    deleteStack: (stackId) => ipcRenderer.send("deleteStack", stackId),
    closeStack: (stackId) => ipcRenderer.send("closeStack", stackId),
    removeFromStack: (tabIndex) => ipcRenderer.send("removeFromStack", tabIndex),
    showStackContextMenu: (vars) => ipcRenderer.send("showStackContextMenu", vars),
    renameStack: (stackId, name) => ipcRenderer.send("renameStack", stackId, name),
    reorderStack: (stackId, toIndex) => ipcRenderer.send("reorderStack", stackId, toIndex),
    onPromptStackName: (callback) => ipcRenderer.on('promptStackName', (event, data) => callback(data)),
    stackBarVisible: (visible) => ipcRenderer.send("stackBarVisible", visible),

})
