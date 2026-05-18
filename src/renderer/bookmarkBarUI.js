const bookmarkBar = document.getElementById("bookmark-bar");
const bookmarkBarList = document.getElementById("bookmark-bar-list");

let bookmarks = [];
let showBookmarkBar = true;

const renderBookmarkBar = () => {
  if (!bookmarkBar || !bookmarkBarList) return;

  bookmarkBar.classList.toggle("hidden", !showBookmarkBar);
  bookmarkBar.classList.toggle("flex", showBookmarkBar);

  if (!showBookmarkBar) {
    bookmarkBarList.innerHTML = "";
    return;
  }

  bookmarkBarList.innerHTML = "";

  if (bookmarks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "theme-faint text-xs px-2 select-none";
    emptyState.textContent = "No bookmarks yet";
    bookmarkBarList.appendChild(emptyState);
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
