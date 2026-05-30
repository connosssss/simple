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
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.5");
    icon.setAttribute("class", "w-3.5 h-3.5 text-amber-400 flex-shrink-0 opacity-80");
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />`;
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
      fallbackSvg.setAttribute("viewBox", "0 0 24 24");
      fallbackSvg.setAttribute("fill", "none");
      fallbackSvg.setAttribute("stroke", "currentColor");
      fallbackSvg.setAttribute("stroke-width", "1.5");
      fallbackSvg.setAttribute("class", "w-3.5 h-3.5 opacity-60 flex-shrink-0");
      fallbackSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />`;
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
