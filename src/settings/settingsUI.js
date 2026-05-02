import { setupCookieControls } from "./cookieControls.js";
import { setupHibernationControls } from "./hibernationControls.js";
import { setupThemeControls } from "./themeControls.js";
import { setupExtensionControls } from "./extensionControls.js";

setupThemeControls();
setupCookieControls();
setupExtensionControls();

const hibernationControls = setupHibernationControls();

window.electronAPI.onUpdateTabs((tabs) => {
  hibernationControls.updateTabs(tabs);
});

window.electronAPI.onInitSettings((settings) => {
  hibernationControls.updateSettings(settings);
});


