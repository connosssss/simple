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
    button.className = "theme-button-alt theme-text text-xs rounded-sm px-2 py-1 max-w-48 truncate transition-all duration-100";
    button.textContent = bookmark.title || bookmark.url;
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
