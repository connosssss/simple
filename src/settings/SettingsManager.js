const { BaseWindow, WebContentsView } = require('electron');
const path = require('node:path');

let settingsUI = null;

module.exports = {
    openSettingsMenu: (parentWindow) => {
        const settingsWindow = new BaseWindow({
            width: 600,
            height: 500,
            parent: parentWindow,
            modal: false,
            autoHideMenuBar: true,
            backgroundColor: '#020617',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        settingsUI = new WebContentsView({

            webPreferences: {
                preload: path.join(__dirname, '../main/preload.js'),
            }

        });

        settingsWindow.contentView.addChildView(settingsUI);
        settingsUI.webContents.loadFile(path.join(__dirname, 'settings.html'));

        
        settingsWindow.on('resize', () => {
            let bounds = settingsWindow.contentView.getBounds();
            settingsUI.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
        });

        let bounds = settingsWindow.contentView.getBounds();
        settingsUI.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
        
        return settingsUI;
    }
};