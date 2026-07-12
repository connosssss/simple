let mainWindow, ui, tabManager = null;
let isStackBarsVisible = 0;

module.exports = {

  resize: (mainWindow, ui, tabManager, stackBarsVisible) => {
    if (!mainWindow || !ui) return;
    
    if (stackBarsVisible !== undefined) {
      isStackBarsVisible = stackBarsVisible;
    }


    let bounds = mainWindow.contentView.getBounds();
    const isFullscreen = mainWindow.isFullScreen();
    const mainTab = tabManager ?  tabManager.getMainTab() : null;

    const stackBarHeight = isStackBarsVisible * 40;
    const bookmarkBarHeight = tabManager?.bookmarkBarVisible ? 38 : 0;
    const topBarHeight = 110 + stackBarHeight + bookmarkBarHeight;

    if (isFullscreen) {
      ui.setBounds({ x: 0, y: 0, width: bounds.width, height: 0 });
      
      if (mainTab) {
        mainTab.contentView.setBounds({
          x: 0, y: 0, width: bounds.width, height: bounds.height
        });
      }
    } 
    
    else {
      const uiPosition = tabManager?.uiPosition || 'top';
      const dropdownVisible = tabManager?.dropdownVisible || tabManager?.downloadsDropdownVisible || tabManager?.passwordPromptVisible;
      const dropdownHeight = dropdownVisible ? 330 : (tabManager?.tabHoverVisible ? 72 : 0);
      const uiHeight = topBarHeight + dropdownHeight;

      if (uiPosition === 'top') {
        ui.setBounds({ x: 0, y: 0, width: bounds.width, height: uiHeight });
        
        if (mainTab) {
          mainTab.contentView.setBounds({
            x: 0, y: topBarHeight, width: bounds.width, height: bounds.height - topBarHeight
          });
        }
      } 
      
      else if (uiPosition === 'bottom') {
        // UI is placed at the bottom, page at the top.
        ui.setBounds({ x: 0, y: bounds.height - uiHeight, width: bounds.width, height: uiHeight });
        
        if (mainTab) {
          mainTab.contentView.setBounds({
            x: 0, y: 0, width: bounds.width, height: bounds.height - topBarHeight
          });
        }
      } 
      
      else if (uiPosition === 'left') {
        // UI is a vertical sidebar on the left, page on the right.
        const sidebarWidth = 220;
        ui.setBounds({ x: 0, y: 0, width: sidebarWidth, height: bounds.height });
        
        if (mainTab) {
          mainTab.contentView.setBounds({
            x: sidebarWidth, y: 0, width: bounds.width - sidebarWidth, height: bounds.height
          });
        }
      } 
      
      else if (uiPosition === 'right') {
        // UI is a vertical sidebar on the right, page on the left.
        const sidebarWidth = 220;
        ui.setBounds({ x: bounds.width - sidebarWidth, y: 0, width: sidebarWidth, height: bounds.height });
        
        if (mainTab) {
          mainTab.contentView.setBounds({
            x: 0, y: 0, width: bounds.width - sidebarWidth, height: bounds.height
          });
        }
      }
    }
  }
};
