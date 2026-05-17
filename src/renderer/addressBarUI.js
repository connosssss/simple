const addressBar = document.getElementById("address-bar");
const bookmarkBtn = document.getElementById("bookmark");
let currentAddress = "";
let bookmarkedUrls = new Set();

const updateBookmarkButton = () => {
  const isBookmarked = bookmarkedUrls.has(currentAddress);
  bookmarkBtn.textContent = isBookmarked ? "★" : "☆";
};

export const updateAddressBar = (address) => {
  currentAddress = address;
  addressBar.value = shortenAddress(address);
  updateBookmarkButton();
};

export const setupAddressBarUI = () => {
  addressBar.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      currentAddress = addressBar.value;
      window.electronAPI.search(addressBar.value);
    }
  });

  addressBar.addEventListener("focus", () => {
    if (currentAddress) {
      addressBar.value = currentAddress;
      addressBar.select();
    }
  });

  addressBar.addEventListener("blur", () => {
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
};

const shortenAddress = (address) => {
  if (!address) return "";

  const queryIndex = address.indexOf("?");
  return queryIndex === -1 ? address : address.substring(0, queryIndex);
};