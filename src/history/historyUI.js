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

  sorted.forEach(item => {
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
    timeSpan.textContent = new Date(item.visitedAt).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    titleContainer.appendChild(timeSpan);

    const url = document.createElement("div");
    url.className = "text-xs text-slate-500 truncate max-w-xl";
    url.textContent = item.url;

    info.appendChild(titleContainer);
    info.appendChild(url);

    const removeBtn = document.createElement("button");
    removeBtn.className = "text-red-400/50 hover:text-red-400 text-xs px-1";
    removeBtn.textContent = "✕";
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
