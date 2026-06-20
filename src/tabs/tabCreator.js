const { WebContentsView, ipcMain } = require("electron");
const path = require("node:path");
const historyManager = require("../history/history");
const { Tab } = require("./TabTree");

const SETTINGS_ADDRESS = "about://settings";
const SETTINGS_TITLE = "Settings";
const HISTORY_ADDRESS = "about://history";
const HISTORY_TITLE = "History";
const MAIN_PARTITION = "persist:main";
const SETTINGS_FILE = path.join(__dirname, "../settings/settings.html");
const HISTORY_FILE = path.join(__dirname, "../history/history.html");
const PRELOAD_FILE = path.join(__dirname, "../main/preload.js");

const createBaseTab = (overrides = {}) => new Tab(overrides);

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

const createSettingsTab = (address = SETTINGS_ADDRESS) => {
  const isHistory = address === HISTORY_ADDRESS;
  const tab = createBaseTab({
    contentView: createSettingsContentView(),
    address: address,
    title: isHistory ? HISTORY_TITLE : SETTINGS_TITLE,
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

  const isHistory = tab.address === HISTORY_ADDRESS;
  tab.title = isHistory ? HISTORY_TITLE : SETTINGS_TITLE;
  tab.contentView.webContents.loadFile(isHistory ? HISTORY_FILE : SETTINGS_FILE);
};

const syncTabState = (tab) => {
  if (!isLiveWebContents(tab.contentView)) return;

  if (tab.isSettingsTab) {
    const isHistory = tab.address === HISTORY_ADDRESS;
    tab.title = isHistory ? HISTORY_TITLE : SETTINGS_TITLE;
    tab.address = isHistory ? HISTORY_ADDRESS : SETTINGS_ADDRESS;
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
  
  tab.isLoading = webContents.isLoading();

  const syncAndBroadcast = () => {
    applyZoomLimits(webContents);
    syncTabState(tab);
    manager.sendTabData();
  };

  const handleDidNavigate = (event, url) => {
    syncAndBroadcast();
    if (url && !url.startsWith("about:") && url !== "about:blank") {
      historyManager.add(url, webContents.getTitle() || url, tab.iconURL || "");
      ipcMain.emit("broadcastHistory");
    }
  };

  const handleDidNavigateInPage = (event, url) => {
    syncAndBroadcast();
    if (url && !url.startsWith("about:") && url !== "about:blank") {
      historyManager.add(url, webContents.getTitle() || url, tab.iconURL || "");
      ipcMain.emit("broadcastHistory");
    }
  };

  const handlePageTitleUpdated = (event, title) => {
    syncAndBroadcast();
    const url = webContents.getURL();
    if (url && !url.startsWith("about:") && url !== "about:blank") {
      historyManager.updateLastEntryTitleAndIcon(url, title, tab.iconURL || "");
      ipcMain.emit("broadcastHistory");
    }
  };

  const handlePageFaviconUpdated = (event, favicons) => {
    tab.iconURL = favicons[0] || "";
    manager.sendTabData();
    const url = webContents.getURL();
    
    if (url && !url.startsWith("about:") && url !== "about:blank") {
      historyManager.updateLastEntryTitleAndIcon(url, null, tab.iconURL);
      ipcMain.emit("broadcastHistory");
    }
  };

  const handleDidStartLoading = () => {
    tab.isLoading = true;
    manager.sendTabData();
  };

  const handleDidStopLoading = () => {
    tab.isLoading = false;
    manager.sendTabData();
  };

  const listeners = [
    ["page-title-updated", handlePageTitleUpdated],
    ["did-navigate", handleDidNavigate],
    ["did-navigate-in-page", handleDidNavigateInPage],
    ["page-favicon-updated", handlePageFaviconUpdated],
    ["did-finish-load", syncAndBroadcast],
    ["did-start-loading", handleDidStartLoading],
    ["did-stop-loading", handleDidStopLoading],
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
    const shouldStayInStack = Boolean(tab.isStacked && tab.stackIds && tab.stackIds.length > 0);

    manager.createTab({
      address: details.url,
      switchTo: shouldOpenInForeground,
      isStacked: shouldStayInStack,
      stackId: shouldStayInStack ? tab.stackIds[0] : null,
      stackIds: shouldStayInStack ? [...tab.stackIds] : [],
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

