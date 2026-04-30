import { setupAddressBarUI, updateAddressBar } from "./addressBarUI.js";
import { setupFindBarUI } from "./findBarUI.js";
import { renderTabs } from "./tabBarUI.js";

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
    window.electronAPI.createTab();
  });

  document.getElementById("settings").addEventListener("click", () => {
    window.electronAPI.showSettingsMenu();
  });
};

const setupTabSubscription = () => {
  let previousTabCount = null;

  window.electronAPI.onUpdateTabs((tabs) => {
    renderTabs(tabs);

    const mainTab = tabs.find((tab) => tab.isMainTab);
    if (mainTab) {
      updateAddressBar(mainTab.address);
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
setupFindBarUI();
setupTabSubscription();