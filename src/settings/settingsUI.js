import { setupCookieControls } from "./cookieControls.js";
import { setupHibernationControls } from "./hibernationControls.js";
import { setupThemeControls } from "./themeControls.js";
import { setupExtensionControls } from "./extensionControls.js";
import { setupBookmarkControls } from "./bookmarkSettingsUI.js";
import { setupTabTreeControls } from "./tabTreeControls.js";


setupThemeControls();
setupCookieControls();
setupExtensionControls();
setupBookmarkControls();

const hibernationControls = setupHibernationControls();
const tabTreeControls = setupTabTreeControls();

window.electronAPI.onUpdateTabs((tabs, tabTree) => {
  if (tabTreeControls) {
    tabTreeControls.update(tabs, tabTree);
  }
});

window.electronAPI.onInitSettings((settings) => {
  hibernationControls.updateSettings(settings);
});


