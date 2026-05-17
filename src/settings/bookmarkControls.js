export function setupBookmarkControls() {
  const list = document.getElementById("bookmarks-list");
  if (!list) return;

  const render = (bookmarks) => {
    if (!bookmarks || bookmarks.length === 0) {
      list.innerHTML = `<div class="text-slate-500 text-sm">No bookmarks saved.</div>`;
      return;
    }

    list.innerHTML = "";

    for (const b of bookmarks) {
      
      const row = document.createElement("div");
      row.className = "bookmark-row";

      const info = document.createElement("div");
      info.className = "bookmark-info";

      const title = document.createElement("div");
      title.className = "bookmark-title";
      title.textContent = b.title || b.url;

      const url = document.createElement("div");
      url.className = "bookmark-url";
      url.textContent = b.url;

      info.appendChild(title);
      info.appendChild(url);

      const removeBtn = document.createElement("button");
      removeBtn.className = "bookmark-remove";
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove bookmark";
      removeBtn.addEventListener("click", async () => {
        await window.electronAPI.removeBookmark(b.url);
        const updated = await window.electronAPI.getBookmarks();
        render(updated);
      });

      row.appendChild(info);
      row.appendChild(removeBtn);
      list.appendChild(row);
    }
  };

  // Initial load
  window.electronAPI.getBookmarks().then(render);
}
