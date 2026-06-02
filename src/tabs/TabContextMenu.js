const { Menu, clipboard, dialog } = require('electron');
const fs = require('fs');

module.exports = {

    attachContextMenu(tab) {
        const webContents = tab.contentView && tab.contentView.webContents;
        if (!webContents || webContents.isDestroyed()) return;

        if (tab.contextMenuHandler) {
            webContents.removeListener('context-menu', tab.contextMenuHandler);
        }

        tab.contextMenuHandler = (event, params) => {
            const menuTemplate = [];

            if (params.linkURL) {

                menuTemplate.push({
                    label: 'Open Link in New Tab',
                    click: () => this.createTab(params.linkURL, false)
                });

                menuTemplate.push({
                    label: 'Copy Link Address',
                    click: () => clipboard.writeText(params.linkURL)
                });

                menuTemplate.push({ type: 'separator' });
            }

            if (params.mediaType === 'image') {

                menuTemplate.push({
                    label: 'Open Image in New Tab',
                    click: () => this.createTab(params.srcURL, false)
                });

                menuTemplate.push({
                    label: 'Save Image As...',
                    click: async () => {
                        if (params.srcURL) {
                            if (params.srcURL.startsWith('data:')) {
                                const ext = params.srcURL.split(';')[0].split('/')[1] || 'png';


                                try {
                                    const { filePath, canceled } = await dialog.showSaveDialog(this.window, {
                                        defaultPath: `image.${ext}`,
                                    });


                                    if (!canceled && filePath) {
                                        const base64Data = params.srcURL.split(',')[1];
                                        const buffer = Buffer.from(base64Data, 'base64');
                                        fs.writeFileSync(filePath, buffer);
                                    }

                                }
                                 catch (err) {
                                    console.error('Error saving base64 image:', err);
                                }
                            } 
                            
                            else {
                                webContents.downloadURL(params.srcURL);
                            }
                        }
                    }
                });

                menuTemplate.push({
                    label: 'Copy Image',
                    click: () => tab.contentView.webContents.copyImageAt(params.x, params.y)
                });

                menuTemplate.push({
                    label: 'Copy Image Address',
                    click: () => clipboard.writeText(params.srcURL)
                });

                menuTemplate.push({ type: 'separator' });
            }

            if (params.mediaType === 'video') {
                menuTemplate.push({
                    label: 'Picture in Picture',
                    click: () => this.togglePictureInPicture(tab, params.x, params.y)
                });
                menuTemplate.push({ type: 'separator' });
            }

            if (params.selectionText) {
                menuTemplate.push({ role: 'copy' });
            }

    
        
            menuTemplate.push({
                label: 'Reload',
                click: () => {
                    tab.isNewTab = false;
                    tab.contentView.webContents.reload();
                }
            });

            menuTemplate.push({ type: 'separator' });

            menuTemplate.push({
                label: 'Inspect Element',
                click: () => tab.contentView.webContents.inspectElement(params.x, params.y)
            });

            const menu = Menu.buildFromTemplate(menuTemplate);
            menu.popup();
        };

        webContents.on('context-menu', tab.contextMenuHandler);
    },

};
