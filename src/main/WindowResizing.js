let mainWindow, ui, tabManager = null;

module.exports = {

  resize: (mainWindow, ui, tabManager) => {
    if (!mainWindow || !ui) return;
    
    let bounds = mainWindow.contentView.getBounds();
    const isFullscreen = mainWindow.isFullScreen();
    const mainTab = tabManager ?  tabManager.getMainTab() : null;

  

    if (isFullscreen) {
      ui.setBounds({ x: 0, y: 0, width: bounds.width, height: 0 });
      
      if (mainTab) {
        mainTab.contentView.setBounds({
          x: 0, y: 0, width: bounds.width, height: bounds.height
        });
      }
    } 
    
    else {
      ui.setBounds({ x: 0, y: 0, width: bounds.width, height: 100 }); // 100px for top bar (for now)
      
      if (mainTab) {
        mainTab.contentView.setBounds({
          x: 0, y: 100, width: bounds.width, height: bounds.height - 100
        });
      }
    }
  }
};