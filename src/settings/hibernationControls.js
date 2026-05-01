const tabsList = document.getElementById("tabs-list");
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

  const renderTabs = (tabs) => {
    tabsList.innerHTML = "";

    if (tabs.length < 2) {
      tabsList.innerHTML = '<div class="text-slate-400">Must have at least 2 tabs open</div>';
      return;
    }

    tabs.forEach((tab, index) => {
      const tabDiv = document.createElement("div");
      tabDiv.className = "flex flex-row items-center justify-between";

      const tabInfo = document.createElement("div");
      tabInfo.className = "flex flex-row gap-2";

      const tabIndex = document.createElement("div");
      tabIndex.className = "text-white font-light text-sm min-h-full flex items-center justify-center border-r border-slate-600 max-w-10 min-w-10 py-2";
      tabIndex.textContent = index + 1;

      const tabTitle = document.createElement("div");
      tabTitle.className = "text-white font-medium min-h-full flex items-center justify-center";
      tabTitle.textContent = tab.title || "New Tab";

      const tabStatus = document.createElement("div");
      tabStatus.className = `text-sm min-h-full ${tab.isActive ? "text-slate-100" : "text-slate-500"} flex items-center justify-center`;
      tabStatus.textContent = tab.isActive ? "Active" : "Hibernated";

      const tabDuration = document.createElement("div");
      tabDuration.className = "text-sm font-light text-slate-400/80 min-h-full flex items-center justify-center";

      const activeMinutes = getTimeTabActiveMinutes(tab.lastActiveAt);
      tabDuration.textContent = activeMinutes;

      if (activeMinutes > closeAfter && closeAfter !== -1 && tab.isActive && !tab.keepActive) {
        window.electronAPI.hibernateTab(index);
      }

      tabInfo.appendChild(tabIndex);
      tabInfo.appendChild(tabTitle);
      tabInfo.appendChild(tabStatus);
      tabInfo.appendChild(tabDuration);

      const hibernateButton = document.createElement("button");
      hibernateButton.className = `rounded-sm text-sm font-light ${tab.isActive ? "bg-red-700/40" : "bg-slate-700/40"} transition-all duration-100 px-4 py-1 text-white`;
      hibernateButton.textContent = tab.isActive ? "Hibernate" : "Hibernated";
      hibernateButton.disabled = !tab.isActive;

      if (tab.isActive) {
        hibernateButton.addEventListener("click", () => {
          window.electronAPI.hibernateTab(index);
        });
      }

      tabDiv.appendChild(tabInfo);
      tabDiv.appendChild(hibernateButton);
      tabsList.appendChild(tabDiv);
    });
  };

  closeAfterSelect.value = closeAfter;
  closeAfterSelect.addEventListener("change", (event) => {
    closeAfter = parseInt(event.target.value, 10);
    localStorage.setItem("closeAfter", closeAfter);
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
    },
  };
};