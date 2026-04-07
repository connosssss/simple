const { Menu, clipboard } = require('electron');

module.exports = {

    attachContextMenu(tab) {
        
        tab.contentView.webContents.on('context-menu', (event, params) => {
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
                    label: 'Copy Image',
                    click: () => tab.contentView.webContents.copyImageAt(params.x, params.y)
                });

                menuTemplate.push({
                    label: 'Copy Image Address',
                    click: () => clipboard.writeText(params.srcURL)
                });

                menuTemplate.push({ type: 'separator' });
            }

            if (params.selectionText) {
                menuTemplate.push({ role: 'copy' });
            }

    
        
            menuTemplate.push({
                label: 'Reload',
                click: () => tab.contentView.webContents.reload()
            });

            menuTemplate.push({ type: 'separator' });

            menuTemplate.push({
                label: 'Inspect Element',
                click: () => tab.contentView.webContents.inspectElement(params.x, params.y)
            });

            const menu = Menu.buildFromTemplate(menuTemplate);
            menu.popup();
        });
    },

};
