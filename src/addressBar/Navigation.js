

module.exports = {

    search: (address, mainTab) => {
        if (!mainTab || !mainTab.contentView) return;

        const urlPattern = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
        let temp = address;

        if (!address.startsWith("https://") && !address.startsWith("http://")) {
            temp = "https://" + address;
        }

        let valid = false;
        
        try {
            const url = new URL(temp);
            valid = url.hostname.includes(".") || url.hostname === "localhost";
        } 
        
        catch (error) {
            valid = false;
        }

        if (valid) {
            mainTab.contentView.webContents.loadURL(temp);
        } 
        
        else {
            mainTab.contentView.webContents.loadURL("https://www.google.com/search?q=" + address);
        }
    },

    toolbarAction: (input, mainTab) => {
        if (!mainTab || !mainTab.contentView) return;
        
        const history = mainTab.contentView.webContents.navigationHistory;
        
        if (history.canGoBack() && input === "back") {
            history.goBack();
        }

        if (input === "forward" && history.canGoForward()) {
            history.goForward();
        }

        if (input === "refresh") {
            mainTab.contentView.webContents.reload();
        }
    }
};