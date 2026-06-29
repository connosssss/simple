export function setupBookmarkControls() {
  const list = document.getElementById("bookmarks-list");
  const toggle = document.getElementById("show-bookmark-bar");
  
  if (!list) return;

  const syncToggle = (settings) => {
    if (!toggle || typeof settings?.showBookmarkBar !== "boolean") return;
    toggle.checked = settings.showBookmarkBar;
  };

  const render = (bookmarks) => {

    if (!bookmarks || bookmarks.length === 0) {
      list.innerHTML = `<div class="text-slate-500 text-sm">No bookmarks saved.</div>`;
      return;
    }

    list.innerHTML = "";

    for (const b of bookmarks) {

      const row = document.createElement("div");
      row.className = "py-2 border-b border-slate-800 flex items-center justify-between text-slate-200 text-sm gap-4";

      const info = document.createElement("div");
      info.className = "flex-1 min-w-0";

      const titleContainer = document.createElement("div");
      titleContainer.className = "flex items-center gap-2";

      const icon = document.createElement("img");
      icon.className = "w-4 h-4 flex-shrink-0 pointer-events-none rounded-sm";

      let domain = "";
      try {
        domain = new URL(b.url).hostname;
      } catch (e) {
        domain = "";
      }

      icon.src = b.iconURL || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : "");

      icon.onerror = () => {
        const fallbackSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        fallbackSvg.setAttribute("viewBox", "0 0 24 24");
        fallbackSvg.setAttribute("fill", "none");
        fallbackSvg.setAttribute("stroke", "currentColor");
        fallbackSvg.setAttribute("stroke-width", "1.5");
        fallbackSvg.setAttribute("class", "w-4 h-4 text-slate-400 flex-shrink-0");
        fallbackSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />`;
        icon.replaceWith(fallbackSvg);
      };

      titleContainer.appendChild(icon);

      const title = document.createElement("span");
      title.className = "font-medium text-slate-100 truncate";
      title.textContent = b.title || b.url;
      titleContainer.appendChild(title);

      const renameBtn = document.createElement("button");
      renameBtn.className = "text-slate-500 hover:text-slate-300 text-xs px-1";
      renameBtn.textContent = "Rename";
      renameBtn.title = "Rename bookmark";
      renameBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = b.title || b.url;
        input.className = "input-theme text-xs px-1.5 py-0.5 rounded outline-none w-44";

        title.replaceWith(input);
        input.focus();
        input.select();

        let isFinished = false;
        const finishRename = async () => {
          if (isFinished) return;
          isFinished = true;
          const nextTitle = input.value.trim();
          if (nextTitle && nextTitle !== (b.title || b.url)) {
            await window.electronAPI.updateBookmark(b.url, { title: nextTitle });
          } else {
            input.replaceWith(title);
          }
        };

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            finishRename();
          } else if (e.key === "Escape") {
            isFinished = true;
            input.replaceWith(title);
          }
        });
        input.addEventListener("blur", () => {
          finishRename();
        });
      });
      titleContainer.appendChild(renameBtn);

      const url = document.createElement("div");
      url.className = "text-xs text-slate-500 truncate max-w-md";
      url.textContent = b.url;

      info.appendChild(titleContainer);
      info.appendChild(url);

      const folderContainer = document.createElement("div");
      folderContainer.className = "flex items-center gap-1.5 flex-shrink-0 text-xs";

      const folderLabel = document.createElement("span");
      folderLabel.className = "text-slate-500";
      folderLabel.textContent = "Folder:";

      const folderInput = document.createElement("input");
      folderInput.type = "text";
      folderInput.placeholder = "None";
      folderInput.value = b.folder || "";
      folderInput.className = "input-theme text-xs px-1.5 py-0.5 rounded outline-none w-24";

      const saveFolder = async () => {
        const nextFolder = folderInput.value.trim();
        if ((b.folder || "") !== nextFolder) {
          await window.electronAPI.updateBookmark(b.url, { folder: nextFolder });
        }
      };

      folderInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          saveFolder();
          folderInput.blur();
        }
      });
      folderInput.addEventListener("blur", () => {
        saveFolder();
      });

      folderContainer.appendChild(folderLabel);
      folderContainer.appendChild(folderInput);

      const removeBtn = document.createElement("button");
      removeBtn.className = "text-red-400/50 hover:text-red-400 p-1 flex items-center justify-center rounded hover:bg-red-500/10 transition-all duration-100";
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
      row.appendChild(folderContainer);
      row.appendChild(removeBtn);
      list.appendChild(row);
    }
  };

  if (toggle) {
    toggle.addEventListener("change", () => {
      window.electronAPI.updateShowBookmarkBar(toggle.checked);
    });
  }

  window.electronAPI.getBookmarks().then(render);
  window.electronAPI.getSettings().then(syncToggle);
  window.electronAPI.onUpdateBookmarks(render);
  window.electronAPI.onInitSettings(syncToggle);
  window.electronAPI.onSettingsUpdated(syncToggle);
}
