

module.exports = {

    search: (address, mainTab, searchSite) => {
        if (!mainTab || !mainTab.contentView) return;

        address = address.trim();
        if (!address) return;

        const knownProtocols = /^(https?|file|ftp|data|chrome|about|javascript):/i;
        if (knownProtocols.test(address)) {
            mainTab.contentView.webContents.loadURL(address);
            return;
        }

        let temp = "https://" + address;
        let valid = false;

    
    
        try {
            const url = new URL(temp);
            const host = url.hostname;
          const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
          //thanks 32h and 33
          const isNumericOnly = /^\d+$/.test(host);

          

          
            const isLocalhost = host === "localhost"
                || host.endsWith(".localhost");

            const hasDot = host.includes(".");
            const hasNoSpaces = !address.includes(" ");

            valid = hasNoSpaces && !isNumericOnly && (isIP || isLocalhost || hasDot);
        }

        catch (error) {
            valid = false;
        }

        if (valid) {
            mainTab.contentView.webContents.loadURL(temp);
        } 
        
        else {
          const searchUrl = (searchSite || "https://www.google.com/search?q=") + encodeURIComponent(address);
          mainTab.contentView.webContents.loadURL(searchUrl);
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