const bookmarkBar = document.getElementById("bookmark-bar");
const bookmarkBarList = document.getElementById("bookmark-bar-list");

let bookmarks = [];
let showBookmarkBar = false;
let lastVisibility = null;

const syncVisibility = (isVisible) => {
  if (lastVisibility === isVisible) return;

  lastVisibility = isVisible;
  window.electronAPI.bookmarkBarVisible(isVisible);
};

const renderBookmarkBar = () => {
  if (!bookmarkBar || !bookmarkBarList) return;

  const shouldShow = showBookmarkBar && bookmarks.length > 0;
  bookmarkBar.classList.toggle("hidden", !shouldShow);
  bookmarkBar.classList.toggle("flex", shouldShow);

  bookmarkBarList.innerHTML = "";

  if (!shouldShow) {
    syncVisibility(false);
    return;
  }

  const folders = {};
  const rootBookmarks = [];

  for (const b of bookmarks) {
    if (b.folder && b.folder.trim() !== "") {
      const folderName = b.folder.trim();
      if (!folders[folderName]) {
        folders[folderName] = [];
      }
      folders[folderName].push(b);
    } else {
      rootBookmarks.push(b);
    }
  }

  const folderNames = Object.keys(folders).sort((a, b) => a.localeCompare(b));

  for (const name of folderNames) {
    const folderBtn = document.createElement("button");
    folderBtn.type = "button";
    folderBtn.className = "theme-button-alt theme-text text-xs rounded-sm px-2 py-1 max-w-48 truncate transition-all duration-100 flex items-center gap-1 font-semibold";

    // Use a clean amber folder SVG icon
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 20 20");
    icon.setAttribute("fill", "currentColor");
    icon.setAttribute("class", "w-3.5 h-3.5 text-amber-400 flex-shrink-0 opacity-80");
    icon.innerHTML = `<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />`;
    folderBtn.appendChild(icon);

    const label = document.createElement("span");
    label.className = "truncate pointer-events-none";
    label.textContent = name;
    folderBtn.appendChild(label);

    folderBtn.title = `${name} folder`;

    folderBtn.addEventListener("click", (e) => {
      const rect = folderBtn.getBoundingClientRect();
      window.electronAPI.showBookmarkFolderMenu({
        folderName: name,
        x: rect.left,
        y: rect.bottom
      });
    });

    bookmarkBarList.appendChild(folderBtn);
  }


  for (const bookmark of rootBookmarks) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-button-alt theme-text text-xs rounded-sm px-2 py-1 max-w-48 truncate transition-all duration-100 flex items-center gap-1";

    const icon = document.createElement("img");
    icon.className = "w-4 h-4 flex-shrink-0 pointer-events-none opacity-75 rounded-sm";

    let domain = "";
    try {
      domain = new URL(bookmark.url).hostname;
    } catch (e) {
      domain = "";
    }

    icon.src = bookmark.iconURL || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : "");

    icon.onerror = () => {
      // Fallback to a default SVG bookmark ribbon icon if image fails to load
      const fallbackSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      fallbackSvg.setAttribute("viewBox", "0 0 20 20");
      fallbackSvg.setAttribute("fill", "currentColor");
      fallbackSvg.setAttribute("class", "w-3.5 h-3.5 opacity-60 flex-shrink-0");
      fallbackSvg.innerHTML = `<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />`;
      icon.replaceWith(fallbackSvg);
    };

    button.appendChild(icon);

    const label = document.createElement("span");
    label.className = "truncate pointer-events-none";
    label.textContent = bookmark.title || bookmark.url;
    button.appendChild(label);

    button.title = bookmark.url;

    button.addEventListener("click", () => {
      window.electronAPI.openBookmark(bookmark.url);
    });

    bookmarkBarList.appendChild(button);
  }

  syncVisibility(true);
};

export const setupBookmarkBarUI = () => {
  if (!bookmarkBar || !bookmarkBarList) return;

  window.electronAPI.getBookmarks().then((savedBookmarks) => {
    bookmarks = savedBookmarks || [];
    renderBookmarkBar();
  });

  window.electronAPI.getSettings().then((settings) => {
    showBookmarkBar = Boolean(settings?.showBookmarkBar);
    renderBookmarkBar();
  });

  window.electronAPI.onUpdateBookmarks((updatedBookmarks) => {
    bookmarks = updatedBookmarks || [];
    renderBookmarkBar();
  });

  window.electronAPI.onSettingsUpdated((settings) => {
    showBookmarkBar = Boolean(settings?.showBookmarkBar);
    renderBookmarkBar();
  });
};
