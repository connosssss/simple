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
  addressBar.focus();
  addressBar.select();
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
      focusAddressBarForNewTab();
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

const setupPasswordPrompt = () => {
  
  const prompt = document.getElementById("password-prompt");
  const userEl = document.getElementById("password-prompt-user");
  const textEl = document.getElementById("password-prompt-text");
  const saveBtn = document.getElementById("password-prompt-save");
  const neverBtn = document.getElementById("password-prompt-never");
  const closeBtn = document.getElementById("password-prompt-close");

  let currentPromptData = null;

  if (window.electronAPI && window.electronAPI.onShowPasswordPrompt) {
    window.electronAPI.onShowPasswordPrompt((data) => {
      
      currentPromptData = data;
      let displayOrigin = data.origin;
      
      try {
        displayOrigin = new URL(data.origin).hostname;
      }
      catch (e) { }

      textEl.textContent = `Would you like to save the password for ${displayOrigin}?`;
      userEl.textContent = data.username || "(no username)";
      
      prompt.classList.remove("hidden");
      prompt.classList.add("flex");
      
      if (window.electronAPI.setPasswordPromptVisible) {
        window.electronAPI.setPasswordPromptVisible(true);
      }
    });
  }

  const hidePrompt = () => {
    prompt.classList.remove("flex");
    prompt.classList.add("hidden");
    currentPromptData = null;
    
    if (window.electronAPI.setPasswordPromptVisible) {
      window.electronAPI.setPasswordPromptVisible(false);
    }
    
  };

  closeBtn.addEventListener("click", hidePrompt);

  saveBtn.addEventListener("click", async () => {
    
    if (currentPromptData) {
      const { origin, username, password } = currentPromptData;
      await window.electronAPI.savePassword(origin, username, password);
    }
    hidePrompt();
    
  });

  neverBtn.addEventListener("click", async () => {
    
    if (currentPromptData) {
      const { origin } = currentPromptData;
      await window.electronAPI.neverSavePassword(origin);
    }
    hidePrompt();
    
  });
};

setupLayoutSubscription();
setupPasswordPrompt();
