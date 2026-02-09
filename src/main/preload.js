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
    
    showContextMenu: (vars) => ipcRenderer.send("showContextMenu", vars),
    showSettingsMenu: (vars) => ipcRenderer.send("showSettingsMenu"),
    hibernateTab: (index) => ipcRenderer.send("hibernateTab", index),

})
