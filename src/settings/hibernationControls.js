const tabsList = document.getElementById("hibernation-tabs-list");
const closeAfterSelect = document.getElementById("close-after-select");
const siteChoiceBar = document.getElementById("siteChoiceBar");
const searchEngineSelect = document.getElementById("search-engine-select");

const getTimeTabActiveMinutes = (lastActive) => {
  if (!lastActive) return -1;

  const activeDurationMs = Date.now() - lastActive;
  return Math.floor(activeDurationMs / 1000 / 60);
};

export const setupHibernationControls = () => {
  let previousTabs = [];
  let closeAfter = parseInt(localStorage.getItem("closeAfter"), 10) || 10;
  let defaultSite = "https://google.com";

  const renderTabRow = (tab, index, container) => {
    const tabDiv = document.createElement("div");
    tabDiv.className = "flex flex-row items-center justify-between p-2 px-3 rounded-md border border-slate-700/30 bg-black/10 hover:bg-black/25 transition-all duration-150 gap-4 mb-1";

    const tabInfo = document.createElement("div");
    tabInfo.className = "flex flex-row items-center gap-3.5 min-w-0 flex-1";

    const tabIndex = document.createElement("div");
    tabIndex.className = "text-xs font-mono font-bold text-slate-500 w-5 text-center flex-shrink-0";
    tabIndex.textContent = index + 1;

    const tabTitle = document.createElement("div");
    tabTitle.className = "text-xs font-semibold text-slate-200 truncate flex-shrink-0";
    tabTitle.textContent = tab.title || "New Tab";

    const icon = document.createElement("img");
    icon.className = "w-4 h-4 flex-shrink-0 rounded-sm";
    
    let domain = "";
    try {
      domain = new URL(tab.address).hostname;
    } catch (e) {
      domain = "";
    }
    
    icon.src = tab.iconURL || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : "");
    
    icon.onerror = () => {
      const fallbackSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      fallbackSvg.setAttribute("viewBox", "0 0 24 24");
      fallbackSvg.setAttribute("fill", "none");
      fallbackSvg.setAttribute("stroke", "currentColor");
      fallbackSvg.setAttribute("stroke-width", "1.5");
      fallbackSvg.setAttribute("class", "w-4 h-4 text-slate-500 flex-shrink-0");
      fallbackSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />`;
      icon.replaceWith(fallbackSvg);
    };

    const tabAddress = document.createElement("div");
    tabAddress.className = "text-[10px] text-slate-500 font-mono truncate min-w-0 flex-1";
    tabAddress.textContent = tab.address || "about:blank";
    tabAddress.title = tab.address || "about:blank";

    tabInfo.appendChild(tabIndex);
    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(icon);
    tabInfo.appendChild(tabAddress);

    const rightSide = document.createElement("div");
    rightSide.className = "flex items-center gap-3 flex-shrink-0";

    if (tab.isActive) {
      const hibernateButton = document.createElement("button");
      hibernateButton.className = "px-3 py-1 text-xs rounded font-medium bg-slate-800/40 border border-slate-700/60 text-slate-300 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 active:scale-95 transition-all duration-100 flex-shrink-0 cursor-pointer shadow-sm";
      hibernateButton.textContent = "Hibernate";
      hibernateButton.addEventListener("click", () => {
        window.electronAPI.hibernateTab(index);
      });
      rightSide.appendChild(hibernateButton);
    } else {
      const tabStatus = document.createElement("span");
      tabStatus.className = "text-xs text-slate-400 font-medium px-3 py-1 border border-transparent flex-shrink-0";
      tabStatus.textContent = "Hibernated";
      rightSide.appendChild(tabStatus);
    }

    tabDiv.appendChild(tabInfo);
    tabDiv.appendChild(rightSide);
    container.appendChild(tabDiv);
  };

  const createStackHeader = (stackId, stackName, stackTabs) => {
    const header = document.createElement("div");
    header.className = "flex items-center justify-between mb-2 mt-4 pb-2 border-b border-slate-700/50";

    const headerLeft = document.createElement("div");
    headerLeft.className = "flex items-center gap-2.5";

    const nameEl = document.createElement("div");
    nameEl.className = "text-xs font-bold uppercase tracking-wider text-slate-300";
    nameEl.textContent = stackName || "Tab Stack";

    const countEl = document.createElement("span");
    countEl.className = "text-[10px] px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/40 text-slate-400 font-semibold";
    countEl.textContent = `${stackTabs.length} tab${stackTabs.length !== 1 ? "s" : ""}`;

    headerLeft.appendChild(nameEl);
    headerLeft.appendChild(countEl);

    const hasActiveTabs = stackTabs.some((t) => t.isActive);

    const hibernateStackBtn = document.createElement("button");
    if (hasActiveTabs) {
      hibernateStackBtn.className = "px-3 py-1 text-xs rounded font-medium bg-slate-800/40 border border-slate-700/60 text-slate-300 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 active:scale-95 transition-all duration-100 cursor-pointer shadow-sm";
      hibernateStackBtn.textContent = "Hibernate Stack";
      hibernateStackBtn.addEventListener("click", () => {
        window.electronAPI.hibernateStack(stackId);
      });
    } else {
      hibernateStackBtn.className = "px-3 py-1 text-xs rounded font-medium bg-transparent border border-slate-700/50 text-slate-500 cursor-not-allowed";
      hibernateStackBtn.textContent = "All Hibernated";
      hibernateStackBtn.disabled = true;
    }

    header.appendChild(headerLeft);
    header.appendChild(hibernateStackBtn);
    return header;
  };

  const renderTabs = (tabs) => {
    tabsList.innerHTML = "";

    if (tabs.length < 2) {
      tabsList.innerHTML = '<div class="text-slate-500 text-xs py-2">Must have at least 2 tabs open</div>';
      return;

    }

    const stacks = new Map();
    const ungrouped = [];

    tabs.forEach((tab, index) => {

      if (tab.isStacked && tab.stackId) {

        if (!stacks.has(tab.stackId)) {
          stacks.set(tab.stackId, { name: tab.stackName, tabs: [] });
        }

        stacks.get(tab.stackId).tabs.push({ tab, index });
      } 
      else {
        ungrouped.push({ tab, index });
      }

    });

    stacks.forEach((stackData, stackId) => {

      const allTabs = stackData.tabs.map((t) => t.tab);
      
      tabsList.appendChild(createStackHeader(stackId, stackData.name, allTabs));
      stackData.tabs.forEach(({ tab, index }) => renderTabRow(tab, index, tabsList));

    });

    if (ungrouped.length > 0 && stacks.size > 0) {

      const header = document.createElement("div");
      header.className = "text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 mt-4 pb-2 border-b border-slate-700/50 flex items-center gap-2";
      
      const textSpan = document.createElement("span");
      textSpan.textContent = "Ungrouped Tabs";
      
      header.appendChild(textSpan);
      tabsList.appendChild(header);

    }

    ungrouped.forEach(({ tab, index }) => renderTabRow(tab, index, tabsList));
  };

  closeAfterSelect.value = closeAfter;
  closeAfterSelect.addEventListener("change", (event) => {
    closeAfter = parseInt(event.target.value, 10);
    localStorage.setItem("closeAfter", closeAfter);
    window.electronAPI.updateCloseAfter(closeAfter);
    renderTabs(previousTabs);
  });

  siteChoiceBar.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    defaultSite = siteChoiceBar.value;
    window.electronAPI.updateDefaultSite(defaultSite);
  });

  searchEngineSelect.addEventListener("change", (event) => {
    window.electronAPI.updateSearchEngine(event.target.value);
  });

  const uiPositionSelect = document.getElementById("ui-position-select");
  if (uiPositionSelect) {
    uiPositionSelect.addEventListener("change", (event) => {
      window.electronAPI.updateUiPosition(event.target.value);
    });
  }

  setInterval(() => {
    renderTabs(previousTabs);
  }, 1000);

  return {
    updateTabs(tabs) {
      previousTabs = tabs;
      renderTabs(tabs);
    },
    updateSettings(settings) {
      if (settings.defaultSite) {
        defaultSite = settings.defaultSite;
        siteChoiceBar.value = defaultSite;
      }

      if (settings.searchEngine) {
        searchEngineSelect.value = settings.searchEngine;
      }

      if (settings.closeAfter !== undefined) {
        closeAfter = settings.closeAfter;
        closeAfterSelect.value = closeAfter;
        localStorage.setItem("closeAfter", closeAfter);
      }

      if (settings.uiPosition && uiPositionSelect) {
        uiPositionSelect.value = settings.uiPosition;
      }
    },
  };
};