let mainWindow, ui, tabManager = null;
let isStackBarVisible = false;

module.exports = {

  resize: (mainWindow, ui, tabManager, stackBarVisible) => {
    if (!mainWindow || !ui) return;
    
    if (stackBarVisible !== undefined) {
      isStackBarVisible = stackBarVisible;
    }


    let bounds = mainWindow.contentView.getBounds();
    const isFullscreen = mainWindow.isFullScreen();
    const mainTab = tabManager ?  tabManager.getMainTab() : null;

    const stackBarHeight = isStackBarVisible ? 32 : 0;
    const bookmarkBarHeight = tabManager?.bookmarkBarVisible ? 32 : 0;
    const topBarHeight = 100 + stackBarHeight + bookmarkBarHeight;

    if (isFullscreen) {
      ui.setBounds({ x: 0, y: 0, width: bounds.width, height: 0 });
      
      if (mainTab) {
        mainTab.contentView.setBounds({
          x: 0, y: 0, width: bounds.width, height: bounds.height
        });
      }
    } 
    
    else {
      const dropdownHeight = tabManager?.dropdownVisible ? 165 : 0;
      const uiHeight = topBarHeight + dropdownHeight;
      ui.setBounds({ x: 0, y: 0, width: bounds.width, height: uiHeight });
      
      if (mainTab) {
        mainTab.contentView.setBounds({
          x: 0, y: topBarHeight, width: bounds.width, height: bounds.height - topBarHeight
        });
      }
    }
  }
};
