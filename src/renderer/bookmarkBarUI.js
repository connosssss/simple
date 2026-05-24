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

  for (const bookmark of bookmarks) {
    
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
