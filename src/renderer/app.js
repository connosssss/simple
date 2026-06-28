import { setupAddressBarUI, updateAddressBar } from "./addressBarUI.js";
import { setupBookmarkBarUI } from "./bookmarkBarUI.js";
import { setupFindBarUI } from "./findbarUI.js";
import { renderTabs, rerenderCurrentTabs } from "./tabBarUI.js";
import { setupExtensionsUI } from "./extensionsUI.js";
import { setupDownloadsUI } from "./downloadsUI.js";

const addressBar = document.getElementById("address-bar");

const applyTheme = () => {
  window.themeUtils.applyTheme();
};

const focusAddressBarForNewTab = () => {
  window.electronAPI.focusUI();

  setTimeout(() => {
    addressBar.focus();
    addressBar.select();
  }, 150);
};

const setupThemeSync = () => {
  applyTheme();

  window.addEventListener("storage", (event) => {
    if (event.key === window.themeUtils.THEME_KEY) {
      applyTheme();
    }
  });

  window.addEventListener("theme-updated", applyTheme);

  if (window.electronAPI?.onThemeUpdated) {
    window.electronAPI.onThemeUpdated(applyTheme);
  }
};

const setupWindowControls = () => {
  document.getElementById("new-tab").addEventListener("click", () => {
    window.electronAPI.createTab({ preventStackInherit: true });
  });

  document.getElementById("settings").addEventListener("click", () => {
    window.electronAPI.showSettingsMenu();
  });
};

const setupTabSubscription = () => {
  let previousTabCount = null;

  const findTreeNode = (node, type) => {
    if (!node) return null;
    if (node.type === type) return node;

    for (const child of node.children || []) {
      const match = findTreeNode(child, type);
      if (match) return match;
    }

    return null;
  };

  window.electronAPI.onUpdateTabs((tabs, tabTree) => {
    const stackLastVisited = {};
    const collectLastVisited = (node) => {
      if (!node) return;
      if (node.type === 'stack' && node.value?.lastVisitedTabId) {
        stackLastVisited[node.id] = node.value.lastVisitedTabId;
      }
      
      for (const child of node.children || []) {
        collectLastVisited(child);
      }
    };
    collectLastVisited(tabTree);

    renderTabs(tabs, stackLastVisited);

    const mainTab = tabs.find((tab) => tab.isMainTab);
    if (mainTab) {
      const addressBarNode = findTreeNode(tabTree, "addressBar");
      const addressFromTree = addressBarNode?.value?.currentAddress;
      updateAddressBar(addressFromTree ?? (mainTab.isNewTab ? "" : mainTab.address));

      const windowTitle = document.getElementById("window-title");

      if (windowTitle) {
        windowTitle.textContent = mainTab.title || "simple";
        windowTitle.className = "theme-text text-sm max-w-[60%] truncate max-h-full";
      }


    }

    const openedNewTab =
      mainTab &&
      previousTabCount !== null &&
      tabs.length > previousTabCount &&
      mainTab.index === tabs.length - 1;

    if (openedNewTab) {
      setTimeout(focusAddressBarForNewTab, 200);
    }

    previousTabCount = tabs.length;
  });
};

setupThemeSync();
setupWindowControls();
setupAddressBarUI();
setupBookmarkBarUI();
setupFindBarUI();
setupExtensionsUI();
setupDownloadsUI();
setupTabSubscription();

const setupLayoutSubscription = () => {
  let currentUiPosition = 'top';

  const applyUiPosition = (position) => {
    if (!position) position = 'top';
    localStorage.setItem("uiPosition", position);
    if (currentUiPosition === position) return;

    document.body.classList.remove('layout-top', 'layout-bottom', 'layout-left', 'layout-right');
    document.body.classList.add(`layout-${position}`);
    currentUiPosition = position;
    if (typeof rerenderCurrentTabs === 'function') {
      rerenderCurrentTabs();
    }
  };

  window.electronAPI.getSettings().then((settings) => {
    if (settings && settings.uiPosition) {
      applyUiPosition(settings.uiPosition);
    }
  });

  window.electronAPI.onSettingsUpdated((settings) => {
    if (settings && settings.uiPosition) {
      applyUiPosition(settings.uiPosition);
    }
  });

  window.electronAPI.onInitSettings((settings) => {
    if (settings && settings.uiPosition) {
      applyUiPosition(settings.uiPosition);
    }
  });
};

setupLayoutSubscription();
