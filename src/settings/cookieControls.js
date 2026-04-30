const cookiesList = document.getElementById("cookies-list");
const cookieCount = document.getElementById("cookie-count");
const cookieSearchInput = document.getElementById("cookie-search");
const hideThirdPartyToggle = document.getElementById("toggle-third-party");
const clearThirdPartyButton = document.getElementById("clear-third-party");
const clearAllCookiesButton = document.getElementById("clear-all-cookies");
const blockTrackersToggle = document.getElementById("block-trackers");

const buildCookieUrl = (cookie) => {
  const protocol = cookie.secure ? "https" : "http";
  const domain = cookie.domain.replace(/^\./, "");
  return `${protocol}://${domain}${cookie.path || "/"}`;
};

export const setupCookieControls = () => {
  let allCookies = [];
  let cookieFilter = "";
  let hideThirdParty = true;

  const getFilteredCookies = () =>
    allCookies.filter((cookie) => {
      if (hideThirdParty && cookie.isThirdParty) {
        return false;
      }

      if (!cookieFilter) {
        return true;
      }

      const filter = cookieFilter.toLowerCase();
      return cookie.domain.toLowerCase().includes(filter) || cookie.name.toLowerCase().includes(filter);
    });

  const renderCookies = () => {
    const filteredCookies = getFilteredCookies();

    cookieCount.textContent = `${filteredCookies.length} of ${allCookies.length} cookie${allCookies.length !== 1 ? "s" : ""}`;

    if (filteredCookies.length === 0) {
      cookiesList.innerHTML = '<div class="text-slate-500 text-sm py-2">No cookies match.</div>';
      return;
    }

    const cookiesByDomain = {};
    filteredCookies.forEach((cookie) => {
      const domain = cookie.domain.replace(/^\./, "");
      if (!cookiesByDomain[domain]) {
        cookiesByDomain[domain] = [];
      }

      cookiesByDomain[domain].push(cookie);
    });

    cookiesList.innerHTML = "";

    Object.entries(cookiesByDomain)
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([domain, cookies]) => {
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

        const deleteDomainButton = document.createElement("button");
        deleteDomainButton.className = "text-red-400/70 text-xs px-2 py-0.5 rounded transition-all duration-100 flex-shrink-0 ml-2";
        deleteDomainButton.textContent = "Delete All";
        deleteDomainButton.addEventListener("click", async (event) => {
          event.stopPropagation();
          await window.electronAPI.deleteCookiesByDomain(domain);
          await loadCookies();
        });

        domainRow.appendChild(domainLabel);
        domainRow.appendChild(deleteDomainButton);

        const cookieContainer = document.createElement("div");
        cookieContainer.className = "hidden";

        cookies.forEach((cookie) => {
          const row = document.createElement("div");
          row.className = "flex items-start justify-between bg-slate-800/40 px-3 py-2 border-l-2 border-slate-700 ml-2 gap-2";

          const info = document.createElement("div");
          info.className = "flex flex-col gap-0.5 min-w-0 flex-1";

          const nameValue = document.createElement("div");
          nameValue.className = "flex gap-2 items-baseline";

          const nameElement = document.createElement("span");
          nameElement.className = "text-slate-100 text-xs font-mono font-semibold truncate max-w-[200px]";
          nameElement.textContent = cookie.name;
          nameElement.title = cookie.name;

          const valueElement = document.createElement("span");
          valueElement.className = "text-slate-400 text-xs font-mono truncate max-w-[280px]";
          valueElement.textContent = cookie.value || "(empty)";
          valueElement.title = cookie.value;

          nameValue.appendChild(nameElement);
          nameValue.appendChild(valueElement);

          const meta = document.createElement("div");
          meta.className = "flex gap-3 flex-wrap";

          const addMeta = (label, value = null, highlight = false) => {
            const metaElement = document.createElement("span");
            metaElement.className = `text-xs ${highlight ? "text-amber-400/80" : "text-slate-500"}`;
            metaElement.textContent = value ? `${label}: ${value}` : label;
            meta.appendChild(metaElement);
          };

          addMeta("path", cookie.path || "/");

          if (cookie.expirationDate) {
            const expirationDate = new Date(cookie.expirationDate * 1000);
            addMeta("expires", expirationDate.toLocaleDateString());
          } else {
            addMeta("expires", "session");
          }

          if (cookie.secure) addMeta("secure", null, true);
          if (cookie.httpOnly) addMeta("httpOnly", null, true);

          info.appendChild(nameValue);
          info.appendChild(meta);

          const deleteButton = document.createElement("button");
          deleteButton.className = "text-red-400/60 text-xs flex-shrink-0 px-1.5 py-0.5 rounded transition-all duration-100 mt-0.5";
          deleteButton.textContent = "x";
          deleteButton.title = "Delete cookie";
          deleteButton.addEventListener("click", async () => {
            await window.electronAPI.deleteCookie(buildCookieUrl(cookie), cookie.name);
            await loadCookies();
          });

          row.appendChild(info);
          row.appendChild(deleteButton);
          cookieContainer.appendChild(row);
        });

        domainRow.addEventListener("click", () => {
          const collapsed = cookieContainer.classList.contains("hidden");
          cookieContainer.classList.toggle("hidden", !collapsed);
          arrow.textContent = collapsed ? "-" : "+";
        });

        cookiesList.appendChild(domainRow);
        cookiesList.appendChild(cookieContainer);
      });
  };

  const loadCookies = async () => {
    try {
      cookiesList.innerHTML = '<div class="text-slate-600 text-sm py-2">Loading...</div>';
      allCookies = await window.electronAPI.getCookies();
      renderCookies();
    } catch (error) {
      cookiesList.innerHTML = '<div class="text-red-400 text-sm">Failed to load cookies.</div>';
    }
  };

  cookieSearchInput.addEventListener("input", (event) => {
    cookieFilter = event.target.value;
    renderCookies();
  });

  hideThirdPartyToggle.checked = true;
  hideThirdPartyToggle.addEventListener("change", (event) => {
    hideThirdParty = event.target.checked;
    renderCookies();
  });

  clearThirdPartyButton.addEventListener("click", async () => {
    const thirdPartyCount = allCookies.filter((cookie) => cookie.isThirdParty).length;
    if (thirdPartyCount === 0) {
      alert("No third-party cookies to clear.");
      return;
    }

    if (!confirm(`Delete ${thirdPartyCount} third-party tracker cookie${thirdPartyCount !== 1 ? "s" : ""}?`)) {
      return;
    }

    await window.electronAPI.clearThirdPartyCookies();
    await loadCookies();
  });

  clearAllCookiesButton.addEventListener("click", async () => {
    if (!confirm(`Delete all ${allCookies.length} cookies? This cannot be undone.`)) {
      return;
    }

    await window.electronAPI.clearAllCookies();
    await loadCookies();
  });

  blockTrackersToggle.checked = true;
  blockTrackersToggle.addEventListener("change", (event) => {
    window.electronAPI.setBlockTrackers(event.target.checked);
  });

  window.electronAPI.setBlockTrackers(blockTrackersToggle.checked);
  loadCookies();
};