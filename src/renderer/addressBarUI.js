const addressBar = document.getElementById("address-bar");
const bookmarkBtn = document.getElementById("bookmark");
const dropdown = document.getElementById("autocomplete-dropdown");

let currentAddress = "";
let bookmarkedUrls = new Set();
let allHistory = [];
let suggestionItems = [];

let selectedIndex = -1;
let originalInputValue = "";
let isDeleting = false;

const updateBookmarkButton = () => {
  const isBookmarked = bookmarkedUrls.has(currentAddress);
  if (isBookmarked) {
    bookmarkBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-amber-500/80 hover:text-amber-400 mx-auto transition-colors duration-100">
        <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
      </svg>
    `;
  } 
  
  else {
    bookmarkBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" class="w-4 h-4 text-slate-400 hover:text-slate-200 mx-auto transition-colors duration-100">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499c.176-.434.772-.434.948 0l2.254 5.53a.75.75 0 0 0 .565.41l6.002.434c.48.034.673.626.31.957l-4.6 4.19a.75.75 0 0 0-.213.657l1.246 5.927c.099.474-.424.855-.838.572l-5.18-3.562a.75.75 0 0 0-.838 0l-5.18 3.562c-.414.283-.938-.098-.838-.572l1.246-5.927a.75.75 0 0 0-.213-.657l-4.6-4.19c-.362-.331-.17-.923.31-.957l6.002-.434a.75.75 0 0 0 .565-.41l2.254-5.53Z" />
      </svg>
    `;
  }
};

export const updateAddressBar = (address) => {
  currentAddress = address;
  addressBar.value = shortenAddress(address);
  updateBookmarkButton();
};

const getMatchableUrl = (url) => {
  if (!url) return "";
  return url.replace(/^(https?:\/\/)?(www\.)?/i, "").toLowerCase();
};

const getRankedHistory = () => {
  const urlMap = new Map();


  for (const item of allHistory) {

    if (!item.url) continue;
    const matchable = getMatchableUrl(item.url);
    if (!matchable) continue;

    if (urlMap.has(item.url)) {
      const existing = urlMap.get(item.url);
      existing.count += 1;
      if (item.visitedAt > existing.visitedAt) {
        existing.title = item.title || existing.title;
        existing.visitedAt = item.visitedAt;
        existing.iconURL = item.iconURL || existing.iconURL;
      }
    } 
    
    else {
      urlMap.set(item.url, {
        url: item.url,
        matchable: matchable,
        title: item.title || item.url,
        iconURL: item.iconURL || "",
        visitedAt: item.visitedAt,
        count: 1
      });
    }
  }

  return Array.from(urlMap.values());
};

const getSuggestions = (query) => {
  const queryClean = query.trim().toLowerCase();
  if (!queryClean) return [];

  const ranked = getRankedHistory();
  const startsWithMatches = [];
  const containsMatches = [];

  for (const item of ranked) {
    if (item.url.startsWith("about:")) continue;

    const matchable = item.matchable;
    const title = item.title.toLowerCase();


    if (matchable.startsWith(queryClean)) {
      startsWithMatches.push(item);
    } 
    
    else if (matchable.includes(queryClean) || title.includes(queryClean)) {
      containsMatches.push(item);
    }
  }

  const sortByScore = (a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return b.visitedAt - a.visitedAt;
  };

  startsWithMatches.sort(sortByScore);
  containsMatches.sort(sortByScore);

  return [...startsWithMatches, ...containsMatches].slice(0, 5);
};

const performInlineCompletion = (topMatch, query) => {
  const matchable = topMatch.matchable;
  if (matchable.startsWith(query.toLowerCase()) && matchable.length > query.length) {
    const currentVal = addressBar.value;
    const typedPart = currentVal.substring(0, query.length);
    const restPart = matchable.substring(query.length);
    addressBar.value = typedPart + restPart;
    addressBar.setSelectionRange(query.length, addressBar.value.length);
  }

};

const hideDropdown = () => {

  if (dropdown) {
    dropdown.classList.add("hidden");
  }
  selectedIndex = -1;
  suggestionItems = [];

  if (window.electronAPI && window.electronAPI.setDropdownVisible) {
    window.electronAPI.setDropdownVisible(false);
  }
};

const updateInputFromSelection = () => {
  if (selectedIndex >= 0 && selectedIndex < suggestionItems.length) {
    addressBar.value = suggestionItems[selectedIndex].url;
  } 
  
  else {
    addressBar.value = originalInputValue;
  }
};

const renderDropdown = () => {
  if (!dropdown) return;

  if (suggestionItems.length === 0) {
    dropdown.innerHTML = "";
    dropdown.classList.add("hidden");
    if (window.electronAPI && window.electronAPI.setDropdownVisible) {
      window.electronAPI.setDropdownVisible(false);
    }


    return;
  }

  if (window.electronAPI && window.electronAPI.setDropdownVisible) {
    window.electronAPI.setDropdownVisible(true);
  }

  dropdown.innerHTML = "";
  suggestionItems.forEach((item, index) => {

    const row = document.createElement("div");
    let rowClasses = "flex items-center h-8 px-3 cursor-pointer transition-colors duration-100 select-none border-b border-white/5 last:border-b-0 overflow-hidden hover:bg-[var(--theme-accent-soft)] hover:brightness-110";
    if (index === selectedIndex) {
      rowClasses += " bg-[var(--theme-accent-soft)] brightness-110";
    }
    row.className = rowClasses;

    const icon = document.createElement("img");
    icon.className = "w-4 h-4 mr-2 shrink-0";
    const cleanDomain = item.matchable.split("/")[0];


    icon.src = item.iconURL || `https://www.google.com/s2/favicons?sz=64&domain=${cleanDomain}`;
    icon.onerror = () => {
      icon.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z'/></svg>";
    };

    const details = document.createElement("div");
    details.className = "flex items-center gap-2 overflow-hidden w-full";

    const title = document.createElement("span");
    title.className = "text-[13px] font-medium text-[var(--theme-text)] truncate shrink-0 max-w-[45%]";
    title.textContent = item.title || item.url;

    const url = document.createElement("span");
    url.className = "text-[11px] text-[var(--theme-muted)] opacity-65 truncate grow";
    url.textContent = item.url;

    details.appendChild(title);
    details.appendChild(url);

    row.appendChild(icon);
    row.appendChild(details);

    row.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    row.addEventListener("click", () => {
      currentAddress = item.url;
      addressBar.value = item.url;
      window.electronAPI.search(item.url);
      hideDropdown();
    });

    dropdown.appendChild(row);
  });

  dropdown.classList.remove("hidden");
};

export const setupAddressBarUI = () => {
  addressBar.addEventListener("input", () => {
    const query = addressBar.value;
    originalInputValue = query;

    if (!query.trim()) {
      hideDropdown();
      return;
    }

    suggestionItems = getSuggestions(query);
    selectedIndex = -1;

    renderDropdown();

    if (suggestionItems.length > 0 && !isDeleting) {
      const cursorPosition = addressBar.selectionStart;
      if (cursorPosition === query.length) {
        performInlineCompletion(suggestionItems[0], query);
      }
    }
  });

  addressBar.addEventListener("keydown", (event) => {
    isDeleting = (event.key === "Backspace" || event.key === "Delete");

    if (dropdown && !dropdown.classList.contains("hidden")) {
      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (suggestionItems.length > 0) {
          selectedIndex = (selectedIndex + 1) % suggestionItems.length;
          updateInputFromSelection();
          renderDropdown();
        }
      } 
      
      else if (event.key === "ArrowUp") {
        event.preventDefault();

        if (suggestionItems.length > 0) {
          if (selectedIndex === -1) {
            selectedIndex = suggestionItems.length - 1;
          } 
          
          else {
            selectedIndex = selectedIndex - 1;
          }

          updateInputFromSelection();
          renderDropdown();
        }
      } 
      
      else if (event.key === "Escape") {
        event.preventDefault();
        addressBar.value = originalInputValue;
        hideDropdown();
      } 
      
      else if (event.key === "Enter") {
        event.preventDefault();
        let targetUrl = addressBar.value;
        if (selectedIndex >= 0 && selectedIndex < suggestionItems.length) {
          targetUrl = suggestionItems[selectedIndex].url;
        }
        currentAddress = targetUrl;
        addressBar.value = targetUrl;
        window.electronAPI.search(targetUrl);
        hideDropdown();
      }
    } 
    
    else {
      if (event.key === "Enter") {
        event.preventDefault();
        currentAddress = addressBar.value;
        window.electronAPI.search(addressBar.value);
      }
    }
  });

  addressBar.addEventListener("focus", () => {
    if (currentAddress) {
      addressBar.value = currentAddress;
      addressBar.select();
    }
  });

  addressBar.addEventListener("blur", () => {
    hideDropdown();
    if (currentAddress) {
      addressBar.value = shortenAddress(currentAddress);
    }
  });

  document.getElementById("forward").addEventListener("click", () => {
    window.electronAPI.toolbarAction("forward");
  });

  document.getElementById("back").addEventListener("click", () => {
    window.electronAPI.toolbarAction("back");
  });

  document.getElementById("refresh").addEventListener("click", () => {
    window.electronAPI.toolbarAction("refresh");
  });

  bookmarkBtn.addEventListener("click", () => {
    window.electronAPI.bookmark();
  });

  // Load initial bookmarks and listen for updates
  window.electronAPI.getBookmarks().then((bookmarks) => {
    bookmarkedUrls = new Set(bookmarks.map(b => b.url));
    updateBookmarkButton();
  });

  window.electronAPI.onUpdateBookmarks((bookmarks) => {
    bookmarkedUrls = new Set(bookmarks.map(b => b.url));
    updateBookmarkButton();
  });

  const updateHistoryCache = (history) => {
    allHistory = history || [];
  };
  
  window.electronAPI.getHistory().then(updateHistoryCache);
  window.electronAPI.onUpdateHistory(updateHistoryCache);
};

const shortenAddress = (address) => {
  if (!address) return "";

  const queryIndex = address.indexOf("?");
  return queryIndex === -1 ? address : address.substring(0, queryIndex);
};