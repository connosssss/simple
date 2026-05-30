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
      removeBtn.className = "bookmark-remove p-1 flex items-center justify-center rounded hover:bg-red-500/10 transition-all duration-100";
      removeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      `;
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
