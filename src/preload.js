// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts



const { contextBridge, ipcRenderer } = require('electron/renderer')



contextBridge.exposeInMainWorld("electronAPI", {

    createTab: () => ipcRenderer.send("createTab"),
    switchTab: (index) => ipcRenderer.send("switchTab", index),
    onUpdateTabs: (callback) => ipcRenderer.on('updateTabs', (event, tabs) => callback(tabs)),
    closeTab: (index) => ipcRenderer.send("closeTab", index),

})
