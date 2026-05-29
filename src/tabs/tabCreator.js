const { WebContentsView } = require("electron");
const path = require("node:path");

const SETTINGS_ADDRESS = "about://settings";
const SETTINGS_TITLE = "Settings";
const MAIN_PARTITION = "persist:main";
const SETTINGS_FILE = path.join(__dirname, "../settings/settings.html");
const PRELOAD_FILE = path.join(__dirname, "../main/preload.js");

const createBaseTab = (overrides = {}) => ({
  contentView: null,
  address: "",
  title: "",
  isActive: true,
  iconURL: "",
  isStacked: false,
  stackId: null,
  lastActiveAt: Date.now(),
  keepActive: false,
  isSettingsTab: false,
  lifecycleCleanup: null,
  contextMenuHandler: null,
  isNewTab: false,
  ...overrides,
});

const isLiveWebContents = (contentView) =>
  Boolean(contentView && contentView.webContents && !contentView.webContents.isDestroyed());

const applyZoomLimits = (webContents) => {
  try {
    webContents.setVisualZoomLevelLimits(1, 5);
  } 
  
  catch (e) {
    console.log("Webcontents destroyed\n Message: ", e.message);

    }
};



const createRegularContentView = () => {
  const view = new WebContentsView({
    webPreferences: {
      partition: MAIN_PARTITION,
    },
  });

  applyZoomLimits(view.webContents);
  return view;
};

const createSettingsContentView = () => {
  const view = new WebContentsView({
    webPreferences: {
      preload: PRELOAD_FILE,
    },
  });
  applyZoomLimits(view.webContents);
  return view;
};


const createRegularTab = ({
  address = "",
  defaultSite,
  isStacked = false,
  stackId = null,
  startHibernated = true,}) => {
    
  const tab = createBaseTab({
    contentView: startHibernated ? null : createRegularContentView(),
    address,
    title: address,
    isActive: !startHibernated,
    isStacked,
    stackId,
    isNewTab: address === "",
  });

  if (!startHibernated) {

    loadRegularTabContent(tab, address, defaultSite);
  }


  return tab;
};

const createSettingsTab = () => {
  const tab = createBaseTab({
    contentView: createSettingsContentView(),
    address: SETTINGS_ADDRESS,
    title: SETTINGS_TITLE,
    isSettingsTab: true,
  });

  loadSettingsTabContent(tab);
  return tab;
};

const loadRegularTabContent = (tab, address, defaultSite) => {
  if (!isLiveWebContents(tab.contentView)) return;

  const targetUrl = address || defaultSite;
  tab.address = targetUrl;
  tab.contentView.webContents.loadURL(targetUrl);
};

const loadSettingsTabContent = (tab) => {
  if (!isLiveWebContents(tab.contentView)) return;

  tab.address = SETTINGS_ADDRESS;
  tab.title = SETTINGS_TITLE;
  tab.contentView.webContents.loadFile(SETTINGS_FILE);
};

const syncTabState = (tab) => {
  if (!isLiveWebContents(tab.contentView)) return;

  if (tab.isSettingsTab) {
    tab.title = SETTINGS_TITLE;
    tab.address = SETTINGS_ADDRESS;
    return;
  }

  tab.title = tab.contentView.webContents.getTitle();
  tab.address = tab.contentView.webContents.getURL();
};

const attachTabLifecycle = (manager, tab) => {
  if (!isLiveWebContents(tab.contentView)) return;

  if (typeof tab.lifecycleCleanup === "function") {
    tab.lifecycleCleanup();
  }

  const { webContents } = tab.contentView;
  
  const syncAndBroadcast = () => {
    applyZoomLimits(webContents);
    syncTabState(tab);
    manager.sendTabData();
  };

  const listeners = [
    ["page-title-updated", syncAndBroadcast],
    ["did-navigate", syncAndBroadcast],
    ["did-navigate-in-page", syncAndBroadcast],
    ["page-favicon-updated", (event, favicons) => {    // NEEDS TO BE CUSTOM
        tab.iconURL = favicons[0] || "";                  // There is no icon getter like there are for title or url so it has to wait for it be be updated
        manager.sendTabData();
    }],
    ["did-finish-load", syncAndBroadcast],
    ["will-navigate", () => {
        tab.isNewTab = false;
        manager.sendTabData();
    }],
  ];

  listeners.forEach(([eventName, handler]) => {
    webContents.on(eventName, handler);
  });

  webContents.setWindowOpenHandler((details) => {
    if (details.features && (details.features.includes("width") || details.features.includes("height"))) {
      return { action: "allow" };
    }

    const shouldOpenInForeground = details.disposition === "foreground-tab";
    const shouldStayInStack = Boolean(tab.isStacked && tab.stackId);

    manager.createTab({
      address: details.url,
      switchTo: shouldOpenInForeground,
      isStacked: shouldStayInStack,
      stackId: shouldStayInStack ? tab.stackId : null,
    });

    return { action: "deny" };
  });

  manager.attachContextMenu(tab);

  tab.lifecycleCleanup = () => {
    if (webContents.isDestroyed()) return;

    listeners.forEach(([eventName, handler]) => {
      webContents.removeListener(eventName, handler);
    });
  };
};

const destroyContentView = (contentView) => {
  if (!isLiveWebContents(contentView)) return;

  contentView.webContents.destroy();
};

module.exports = {
  SETTINGS_ADDRESS,
  SETTINGS_TITLE,
  attachTabLifecycle,
  createRegularContentView,
  createRegularTab,
  createSettingsContentView,
  createSettingsTab,
  destroyContentView,
  isLiveWebContents,
  loadRegularTabContent,
  loadSettingsTabContent,
  syncTabState,
};

