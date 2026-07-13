import { getSuggestions, setHistory, banUrl, shortenAddress } from "../addressBar/autocomplete.js";

const addressBar = document.getElementById("address-bar");
const bookmarkBtn = document.getElementById("bookmark");
const dropdown = document.getElementById("autocomplete-dropdown");

let currentAddress = "";
let bookmarkedUrls = new Set();
let suggestionItems = [];

let selectedIndex = -1;
let originalInputValue = "";
let isDeleting = false;
let isUserEditingAddress = false;

const isAddressBarFocused = () => document.activeElement === addressBar;

const updateBookmarkButton = () => {
  const isBookmarked = bookmarkedUrls.has(currentAddress);
  if (isBookmarked) {
    bookmarkBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-amber-500">
        <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
      </svg>
    `;
  } 
  
  else {
    bookmarkBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499c.176-.434.772-.434.948 0l2.254 5.53a.75.75 0 0 0 .565.41l6.002.434c.48.034.673.626.31.957l-4.6 4.19a.75.75 0 0 0-.213.657l1.246 5.927c.099.474-.424.855-.838.572l-5.18-3.562a.75.75 0 0 0-.838 0l-5.18 3.562c-.414.283-.938-.098-.838-.572l1.246-5.927a.75.75 0 0 0-.213-.657l-4.6-4.19c-.362-.331-.17-.923.31-.957l6.002-.434a.75.75 0 0 0 .565-.41l2.254-5.53Z" />
      </svg>
    `;
  }
};

export const updateAddressBar = (address) => {
  currentAddress = address || "";
  if (!(isUserEditingAddress && isAddressBarFocused())) {
    addressBar.value = shortenAddress(currentAddress);
  }
  updateBookmarkButton();
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
    const item = suggestionItems[selectedIndex];
    addressBar.value = item.isSearch ? item.matchable : item.url;
  } 
  
  else {
    addressBar.value = originalInputValue;
  }
};

const escapeHtml = (str) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const highlightMatch = (text, query) => {
  if (!text) return "";
  if (!query) return escapeHtml(text);
  
  const queryClean = query.trim().toLowerCase();
  if (!queryClean) return escapeHtml(text);
  
  const index = text.toLowerCase().indexOf(queryClean);
  if (index === -1) return escapeHtml(text);
  
  const before = text.substring(0, index);
  const match = text.substring(index, index + queryClean.length);
  const after = text.substring(index + queryClean.length);
  
  return `${escapeHtml(before)}<strong class="font-extrabold text-white">${escapeHtml(match)}</strong>${escapeHtml(after)}`;
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
    let rowClasses = "flex items-center h-10 px-4 cursor-pointer transition-colors duration-150 select-none border-b border-white/5 last:border-b-0 overflow-hidden group hover:bg-[rgba(128,128,128,0.12)]";
    if (index === selectedIndex) {
      rowClasses += " bg-[var(--theme-accent-soft)]";
    }
    
    row.className = rowClasses;

    const icon = document.createElement("img");
    icon.className = "w-4 h-4 mr-2.5 shrink-0";
    
    if (item.isSearch) {
      icon.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'></circle><line x1='21' y1='21' x2='16.65' y2='16.65'></line></svg>";
    }
    
    else {
      const cleanDomain = item.matchable.split("/")[0];
      icon.src = item.iconURL || `https://www.google.com/s2/favicons?sz=64&domain=${cleanDomain}`;
      icon.onerror = () => {
        icon.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z'/></svg>";
      };
    }

    const details = document.createElement("div");
    details.className = "flex items-center gap-2 overflow-hidden grow mr-2";

    const title = document.createElement("span");
    title.className = index === selectedIndex
      ? "text-[12px] font-medium text-white opacity-100 truncate shrink-0 max-w-[45%]"
      : "text-[12px] font-medium text-[var(--theme-text)] opacity-85 truncate shrink-0 max-w-[45%]";
    title.innerHTML = highlightMatch(item.title || item.url, addressBar.value);

    const url = document.createElement("span");
    url.className = index === selectedIndex
      ? "text-[12px] text-white opacity-100 truncate grow"
      : "text-[12px] text-[var(--theme-muted)] opacity-60 truncate grow";
    url.innerHTML = item.isSearch ? "" : highlightMatch(item.url, addressBar.value);

    details.appendChild(title);
    details.appendChild(url);

    row.appendChild(icon);
    row.appendChild(details);

    let hasBadge = false;
    if (item.isSearch || bookmarkedUrls.has(item.url)) {
      hasBadge = true;
      const badge = document.createElement("span");
      badge.className = index === selectedIndex
        ? "suggestion-badge text-[10px] font-medium tracking-wide text-white opacity-90 bg-white/20 px-1.5 py-0.5 rounded ml-auto mr-1 shrink-0 select-none"
        : "suggestion-badge text-[10px] font-medium tracking-wide text-[var(--theme-muted)] opacity-50 bg-white/5 px-1.5 py-0.5 rounded ml-auto mr-1 shrink-0 select-none";
      if (item.isSearch) {
        badge.textContent = "Search";
      } else {
        badge.textContent = "Bookmark";
        if (index !== selectedIndex) {
          badge.style.color = "#f59e0b";
        }
      }
      row.appendChild(badge);
    }

    if (!item.isSearch) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = `w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/15 text-white/40 hover:text-white/80 transition-colors shrink-0 opacity-0 group-hover:opacity-100 ${hasBadge ? "ml-1" : "ml-auto"}`;
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>`;

        
      deleteBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        banUrl(item.url);
        
        suggestionItems = getSuggestions(addressBar.value);
        selectedIndex = -1;
        renderDropdown();
      });

      row.appendChild(deleteBtn);
    }

    row.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    row.addEventListener("click", () => {
      isUserEditingAddress = false;
      if (item.isSearch) {
        currentAddress = item.url;
        addressBar.value = item.matchable;
        window.electronAPI.search(item.url);
      } 
      else {
        currentAddress = item.url;
        addressBar.value = item.url;
        window.electronAPI.search(item.url);
      }
      hideDropdown();
    });

    dropdown.appendChild(row);
  });

  dropdown.classList.remove("hidden");
};

export const setupAddressBarUI = () => {
  addressBar.addEventListener("input", () => {
    isUserEditingAddress = true;
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
        isUserEditingAddress = false;
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
        isUserEditingAddress = false;
        currentAddress = addressBar.value;
        window.electronAPI.search(addressBar.value);
      }
    }
  });

  addressBar.addEventListener("focus", () => {
    isUserEditingAddress = false;
    if (currentAddress) {
      addressBar.value = currentAddress;
      addressBar.select();
    }
  });

  addressBar.addEventListener("blur", () => {
    isUserEditingAddress = false;
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
    setHistory(history);
  };
  
  window.electronAPI.getHistory().then(updateHistoryCache);
  window.electronAPI.onUpdateHistory(updateHistoryCache);
};
