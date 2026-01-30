import { useState, useEffect } from 'react';
import TitleBar from './components/titlebar';
import TabBar from './components/TabBar';
import AddressBar from './components/AddressBar';

function App() {
  const [tabs, setTabs] = useState([]);
  const [currentAddress, setCurrentAddress] = useState('');

  useEffect(() => {
    window.electronAPI.onUpdateTabs((updatedTabs) => {
      setTabs(updatedTabs);
      
      const mainTab = updatedTabs.find(tab => tab.isMainTab);
      if (mainTab) {
        setCurrentAddress(mainTab.address);
      }
    });
  }, []);

  const handleCreateTab = () => {
    window.electronAPI.createTab();
  };

  const handleSwitchTab = (index) => {
    window.electronAPI.switchTab(index);
  };

  const handleCloseTab = (index) => {
    window.electronAPI.closeTab(index);
  };

  const handleReorderTabs = (fromIndex, toIndex) => {
    window.electronAPI.reorderTabs(fromIndex, toIndex);
  };

  const handleSearch = (address) => {
    window.electronAPI.search(address);
  };

  const handleToolbarAction = (action) => {
    window.electronAPI.toolbarAction(action);
  };

  const handleShowContextMenu = (vars) => {
    window.electronAPI.showContextMenu(vars);
  };

  const handleShowSettings = () => {
    window.electronAPI.showSettingsMenu();
  };

  return (
    <div className="overflow-hidden m-0 p-0">
      <TitleBar />
      
      <TabBar
        tabs={tabs}
        onCreateTab={handleCreateTab}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
        onReorderTabs={handleReorderTabs}
        onShowContextMenu={handleShowContextMenu}
      />
      
      <AddressBar
        currentAddress={currentAddress}
        onSearch={handleSearch}
        onToolbarAction={handleToolbarAction}
        onShowSettings={handleShowSettings}
      />
    </div>
  );
}

export default App;