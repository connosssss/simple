const searchInput = document.getElementById("history-search");
const clearBtn = document.getElementById("clear-history-btn");
const historyList = document.getElementById("history-list");
const noHistoryMsg = document.getElementById("no-history-msg");

let allHistory = [];

const renderHistory = (historyItems) => {

  historyList.innerHTML = "";

  if (!historyItems || historyItems.length === 0) {
    historyList.appendChild(noHistoryMsg);
    noHistoryMsg.classList.remove("hidden");
    return;
  }

  noHistoryMsg.classList.add("hidden");

  const sorted = [...historyItems].sort((a, b) => b.visitedAt - a.visitedAt);

  const startOfToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const startOfThisMonth = startOfToday - 29 * 24 * 60 * 60 * 1000;

  const groups = [
    { title: "Today", items: [] },
    { title: "This Week", items: [] },
    { title: "This Month", items: [] },
    { title: "Earlier", items: [] }
  ];

  sorted.forEach(item => {
    if (item.visitedAt >= startOfToday) groups[0].items.push(item);
    else if (item.visitedAt >= startOfThisWeek) groups[1].items.push(item);
    else if (item.visitedAt >= startOfThisMonth) groups[2].items.push(item);
    else groups[3].items.push(item);
  });

  groups.forEach(group => {
    if (group.items.length === 0) return;

    const header = document.createElement("div");
    header.className = "text-xs font-semibold text-slate-400 uppercase tracking-wider pt-6 pb-2 select-none border-b border-slate-800/40 mt-4 mb-2 first:mt-2";
    header.textContent = group.title;
    historyList.appendChild(header);

    group.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "py-2 border-b border-slate-800 flex items-center justify-between text-slate-200 text-sm gap-4 cursor-pointer hover:bg-slate-900/40 px-2 rounded-sm";

      row.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "button" || e.target.closest("button")) {
          return;
        }

        if (window.electronAPI && window.electronAPI.openBookmark) {
          window.electronAPI.openBookmark(item.url);
        }
      });

      const info = document.createElement("div");
      info.className = "flex-1 min-w-0";

      const titleContainer = document.createElement("div");
      titleContainer.className = "flex items-center gap-2";

      const title = document.createElement("span");
      title.className = "font-medium text-slate-100 truncate";
      title.textContent = item.title || item.url;
      titleContainer.appendChild(title);

      const timeSpan = document.createElement("span");
      timeSpan.className = "text-xs text-slate-500 flex-shrink-0";
      if (group.title === "Today") {
        timeSpan.textContent = new Date(item.visitedAt).toLocaleTimeString(undefined, {
          hour: '2-digit', minute: '2-digit'
        });
      } 
      
      else {
        timeSpan.textContent = new Date(item.visitedAt).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }
      
      titleContainer.appendChild(timeSpan);

    const url = document.createElement("div");
    url.className = "text-xs text-slate-500 truncate max-w-xl";
    url.textContent = item.url;

    info.appendChild(titleContainer);
    info.appendChild(url);

    const removeBtn = document.createElement("button");
    removeBtn.className = "text-red-400/50 hover:text-red-400 p-1 flex items-center justify-center rounded hover:bg-red-500/10 transition-all duration-100";
    removeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    `;
    removeBtn.title = "Remove history entry";

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.electronAPI && window.electronAPI.deleteHistoryItem) {
        window.electronAPI.deleteHistoryItem(item.id);
      }
    });

    row.appendChild(info);
    row.appendChild(removeBtn);
    historyList.appendChild(row);
  });
});

};

const filterHistory = () => {
  const query = searchInput.value.toLowerCase().trim();
  const filtered = allHistory.filter(item => {
    const title = (item.title || "").toLowerCase();
    const url = (item.url || "").toLowerCase();
    return title.includes(query) || url.includes(query);
  });
  renderHistory(filtered);
};

if (window.electronAPI) {
  window.electronAPI.onUpdateHistory((history) => {
    allHistory = history;
    filterHistory();
  });

  if (window.electronAPI.getHistory) {
    window.electronAPI.getHistory().then(history => {
      allHistory = history || [];
      filterHistory();
    });
  }
}

searchInput.addEventListener("input", filterHistory);

clearBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all history?")) {
    if (window.electronAPI && window.electronAPI.clearHistory) {
      window.electronAPI.clearHistory();
    }
  }
});
