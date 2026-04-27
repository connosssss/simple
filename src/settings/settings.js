const tabsList = document.getElementById("tabs-list");

window.themeUtils.applyTheme();

const syncThemeControls = () => {
  const theme = window.themeUtils.getTheme();
  document.getElementById("theme-color").value = theme.color;
  document.getElementById("theme-accent").value = theme.accent;
  document.getElementById("theme-overall-opacity").value = theme.overallOpacity;
  document.getElementById("theme-accent-opacity").value = theme.accentOpacity;
  document.getElementById("theme-color-value").textContent = theme.color;
  document.getElementById("theme-accent-value").textContent = theme.accent;
  document.getElementById("theme-overall-opacity-value").textContent = `${Math.round(theme.overallOpacity * 100)}%`;
  document.getElementById("theme-accent-opacity-value").textContent = `${Math.round(theme.accentOpacity * 100)}%`;
};

window.addEventListener("storage", (event) => {
  if (event.key === window.themeUtils.THEME_KEY) {
    syncThemeControls();
    window.themeUtils.applyTheme();
  }
});

window.addEventListener("theme-updated", () => {
  syncThemeControls();
  window.themeUtils.applyTheme();
});

document.getElementById("theme-color").addEventListener("input", (e) => {
  window.themeUtils.saveTheme({ color: e.target.value });
});

document.getElementById("theme-accent").addEventListener("input", (e) => {
  window.themeUtils.saveTheme({ accent: e.target.value });
});

document.getElementById("theme-overall-opacity").addEventListener("input", (e) => {
  window.themeUtils.saveTheme({ overallOpacity: Number(e.target.value) });
});

document.getElementById("theme-accent-opacity").addEventListener("input", (e) => {
  window.themeUtils.saveTheme({ accentOpacity: Number(e.target.value) });
});

syncThemeControls();

// Need to use a prev state bacuse 
let prevTabState = [];
let closeAfter = parseInt(localStorage.getItem("closeAfter")) || 10;
let defaultSite = "https://google.com";

window.electronAPI.onUpdateTabs((tabs) => {
  renderTabs(tabs);
  prevTabState = tabs;


});



const closeAfterSelect = document.getElementById("close-after-select");
if (closeAfterSelect) {
  closeAfterSelect.value = closeAfter;

  closeAfterSelect.addEventListener("change", (e) => {
    closeAfter = parseInt(e.target.value);
    localStorage.setItem("closeAfter", closeAfter);
    renderTabs(prevTabState);
  });
}

const getTimeTabActive = (lastActive) => {
  if (!lastActive) return -1;

  const now = Date.now();
  const dur = now - lastActive;

  const s = Math.floor(dur / 1000);
  const m = Math.floor(s/60);

  return m;

}

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

    const tIndex = document.createElement("div");
    tIndex.className = "text-white font-light text-sm min-h-full flex items-center justify-center border-r border-slate-600 max-w-10 min-w-10 py-2";
    tIndex.textContent =  index + 1;


    const tabTitle = document.createElement("div");
    tabTitle.className = "text-white font-medium min-h-full flex items-center justify-center ";
    tabTitle.textContent =  tab.title || "New Tab";

    const tabStatus = document.createElement("div");
    tabStatus.className = `text-sm min-h-full ${tab.isActive ? "text-slate-100" : "text-slate-500"} flex items-center justify-center`;
    tabStatus.textContent = tab.isActive ? "Active" : "Hibernated";

    const tabDur = document.createElement("div");
    tabDur.className = "text-sm font-light text-slate-400/80 min-h-full flex items-center justify-center";

    const tabDuration = getTimeTabActive(tab.lastActiveAt);
    tabDur.textContent = tabDuration;
    if (tabDuration > closeAfter && closeAfter !== -1 && tab.isActive && !tab.keepActive) {
      window.electronAPI.hibernateTab(index);
    }

    tabInfo.appendChild(tIndex);
    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(tabStatus);
    tabInfo.appendChild(tabDur);

    const hibernateBtn = document.createElement("button");
    hibernateBtn.className = `rounded-sm text-sm font-light ${tab.isActive ? "bg-red-700/40" : "bg-slate-700/40"} transition-all duration-100 px-4 py-1 text-white`;
    hibernateBtn.textContent = tab.isActive ? "Hibernate" : "Hibernated";
    hibernateBtn.disabled = !tab.isActive;

    if (tab.isActive) {
      hibernateBtn.onclick = () => {
        window.electronAPI.hibernateTab(index);
      };
    }

    tabDiv.appendChild(tabInfo);
    tabDiv.appendChild(hibernateBtn);
    tabsList.appendChild(tabDiv);
  });
};

setInterval(() => {
  renderTabs(prevTabState);
}, 1000);

const siteChoice = document.getElementById("siteChoiceBar");

siteChoice.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    defaultSite = siteChoice.value;
    window.electronAPI.updateDefaultSite(defaultSite);
  }
});

window.electronAPI.onInitSettings((settings) => {
  if (settings.defaultSite) {
    defaultSite = settings.defaultSite;
    document.getElementById("siteChoiceBar").value = defaultSite;
  }
  if (settings.searchEngine) {
    document.getElementById("search-engine-select").value = settings.searchEngine;
  }
});

const searchEngineSelect = document.getElementById("search-engine-select");
searchEngineSelect.addEventListener("change", (e) => {
  window.electronAPI.updateSearchEngine(e.target.value);
});

let allCookies = [];
let cookieFilter = "";
let hideThirdParty = true;

const cookiesList = document.getElementById("cookies-list");
const cookieCount = document.getElementById("cookie-count");

const buildCookieUrl = (cookie) => {
  const protocol = cookie.secure ? "https" : "http";
  const domain = cookie.domain.replace(/^\./, "");

  return `${protocol}://${domain}${cookie.path || "/"}`;
};

const getFilteredCookies = () => {
  return allCookies.filter((cookie) => {
    if (hideThirdParty && cookie.isThirdParty) return false;

    if (cookieFilter) {
      const f = cookieFilter.toLowerCase();
      return cookie.domain.toLowerCase().includes(f) || cookie.name.toLowerCase().includes(f);
    }
    return true;
  });
};

const renderCookies = () => {
  const filtered = getFilteredCookies();

  cookieCount.textContent = `${filtered.length} of ${allCookies.length} cookie${allCookies.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    cookiesList.innerHTML = '<div class="text-slate-500 text-sm py-2">No cookies match.</div>';
    return;
  }

  const byDomain = {};

  filtered.forEach((cookie) => {
    const domain = cookie.domain.replace(/^\./, "");
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(cookie);
  });

  cookiesList.innerHTML = "";

  Object.entries(byDomain).sort(([a], [b]) => a.localeCompare(b)).forEach(([domain, cookies]) => {
    const isThirdParty = cookies.every((cookie) => cookie.isThirdParty);

    const domainRow = document.createElement("div");
    domainRow.className = "flex items-center justify-between bg-slate-900 px-3 py-2 rounded-sm mt-2 cursor-pointer select-none";

    const domainLabel = document.createElement("div");
    domainLabel.className = "flex items-center gap-2 min-w-0";

    const arrow = document.createElement("span");
    arrow.className = "text-slate-400 text-xs flex-shrink-0";
    arrow.textContent = "-";

    const domainText = document.createElement("span");
    domainText.className = "text-slate-200 text-sm font-medium truncate";
    domainText.textContent = domain;

    const countBadge = document.createElement("span");
    countBadge.className = "text-slate-500 text-xs flex-shrink-0";
    countBadge.textContent = `${cookies.length} cookie${cookies.length !== 1 ? "s" : ""}`;

    domainLabel.appendChild(arrow);
    domainLabel.appendChild(domainText);
    domainLabel.appendChild(countBadge);

    if (isThirdParty) {
      const trackerBadge = document.createElement("span");
      trackerBadge.className = "text-xs bg-orange-900/50 text-orange-300/80 px-1.5 py-0 rounded flex-shrink-0";
      trackerBadge.title = "cookie set by a third-party";
      trackerBadge.textContent = "3rd party";
      domainLabel.appendChild(trackerBadge);
    }

    const deleteDomainBtn = document.createElement("button");
    deleteDomainBtn.className = "text-red-400/70 text-xs px-2 py-0.5 rounded transition-all duration-100 flex-shrink-0 ml-2";
    deleteDomainBtn.textContent = "Delete All";
    deleteDomainBtn.onclick = async (e) => {
      e.stopPropagation();
      await window.electronAPI.deleteCookiesByDomain(domain);
      await loadCookies();
    };

    domainRow.appendChild(domainLabel);
    domainRow.appendChild(deleteDomainBtn);

    const cookieContainer = document.createElement("div");
    cookieContainer.className = "hidden";

    cookies.forEach((cookie) => {
      const row = document.createElement("div");
      row.className = "flex items-start justify-between bg-slate-800/40 px-3 py-2 border-l-2 border-slate-700 ml-2 gap-2";

      const info = document.createElement("div");
      info.className = "flex flex-col gap-0.5 min-w-0 flex-1";

      const nameVal = document.createElement("div");
      nameVal.className = "flex gap-2 items-baseline";

      const nameEl = document.createElement("span");
      nameEl.className = "text-slate-100 text-xs font-mono font-semibold truncate max-w-[200px]";
      nameEl.textContent = cookie.name;
      nameEl.title = cookie.name;

      const valueEl = document.createElement("span");
      valueEl.className = "text-slate-400 text-xs font-mono truncate max-w-[280px]";
      valueEl.textContent = cookie.value || "(empty)";
      valueEl.title = cookie.value;

      nameVal.appendChild(nameEl);
      nameVal.appendChild(valueEl);

      const meta = document.createElement("div");
      meta.className = "flex gap-3 flex-wrap";

      const addMeta = (label, val = null, highlight = false) => {
        const el = document.createElement("span");
        el.className = `text-xs ${highlight ? "text-amber-400/80" : "text-slate-500"}`;
        el.textContent = val ? `${label}: ${val}` : label;
        meta.appendChild(el);
      };

      addMeta("path", cookie.path || "/");
      if (cookie.expirationDate) {
        const exp = new Date(cookie.expirationDate * 1000);
        addMeta("expires", exp.toLocaleDateString());
      } else {
        addMeta("expires", "session");
      }

      if (cookie.secure) addMeta("secure", null, true);
      if (cookie.httpOnly) addMeta("httpOnly", null, true);

      info.appendChild(nameVal);
      info.appendChild(meta);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "text-red-400/60 text-xs flex-shrink-0 px-1.5 py-0.5 rounded transition-all duration-100 mt-0.5";
      deleteBtn.textContent = "✕";
      deleteBtn.title = "Delete cookie";
      deleteBtn.onclick = async () => {
        await window.electronAPI.deleteCookie(buildCookieUrl(cookie), cookie.name);
        await loadCookies();
      };

      row.appendChild(info);
      row.appendChild(deleteBtn);
      cookieContainer.appendChild(row);
    });

    domainRow.onclick = () => {
      const collapsed = cookieContainer.classList.contains("hidden");
      cookieContainer.classList.toggle("hidden", !collapsed);
    };

    cookiesList.appendChild(domainRow);
    cookiesList.appendChild(cookieContainer);
  });
};

const loadCookies = async () => {
  try {
    cookiesList.innerHTML = '<div class="text-slate-600 text-sm py-2">Loading...</div>';
    allCookies = await window.electronAPI.getCookies();
    renderCookies();
  } catch (e) {
    cookiesList.innerHTML = '<div class="text-red-400 text-sm">Failed to load cookies.</div>';
  }
};

document.getElementById("cookie-search").addEventListener("input", (e) => {
  cookieFilter = e.target.value;
  renderCookies();
});

document.getElementById("toggle-third-party").checked = true;
document.getElementById("toggle-third-party").addEventListener("change", (e) => {
  hideThirdParty = e.target.checked;
  renderCookies();
});

document.getElementById("clear-third-party").addEventListener("click", async () => {
  const count = allCookies.filter((cookie) => cookie.isThirdParty).length;
  if (count === 0) {
    alert("No third-party cookies to clear.");
    return;
  }

  if (!confirm(`Delete ${count} third-party tracker cookie${count !== 1 ? "s" : ""}?`)) return;

  await window.electronAPI.clearThirdPartyCookies();
  await loadCookies();
});

document.getElementById("clear-all-cookies").addEventListener("click", async () => {
  if (!confirm(`Delete all ${allCookies.length} cookies? This cannot be undone.`)) return;
  await window.electronAPI.clearAllCookies();
  await loadCookies();
});

document.getElementById("block-trackers").addEventListener("change", (e) => {
  window.electronAPI.setBlockTrackers(e.target.checked);
});

window.electronAPI.setBlockTrackers(true);

loadCookies();
