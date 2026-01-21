const { app, BaseWindow, WebContentsView, globalShortcut, ipcMain, Menu, NavigaitonHistory } = require('electron');
const { create } = require('node:domain');
const path = require('node:path');







const showSettingsMenu = () => {


    
}




// APP SETUP
const setup = () => {



    ipcMain.on("showSettingsMenu", showSettingsMenu)
}

app.whenReady().then(() => {

  setup();
});