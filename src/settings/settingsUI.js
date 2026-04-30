import { setupCookieControls } from "./cookieControls.js";
import { setupHibernationControls } from "./hibernationControls.js";
import { setupThemeControls } from "./themeControls.js";

setupThemeControls();
setupCookieControls();

const hibernationControls = setupHibernationControls();

window.electronAPI.onUpdateTabs((tabs) => {
  hibernationControls.updateTabs(tabs);
});

window.electronAPI.onInitSettings((settings) => {
  hibernationControls.updateSettings(settings);
});


