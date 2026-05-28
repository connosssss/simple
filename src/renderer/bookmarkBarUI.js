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

    const icon = document.createElement("span");
    icon.className = "opacity-75 flex-shrink-0";
    icon.textContent = "F";
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

    if (bookmark.iconURL) {
      const icon = document.createElement("img");
      icon.src = bookmark.iconURL;
      icon.className = "w-4 h-4 flex-shrink-0 pointer-events-none opacity-75";
      button.appendChild(icon);
    }

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
