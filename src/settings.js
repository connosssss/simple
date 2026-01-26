const tabsList = document.getElementById("tabs-list");

window.electronAPI.onUpdateTabs((tabs) => {
  renderTabs(tabs);
});


const renderTabs = (tabs) => {

  tabsList.innerHTML = "";
  tabsList.className = ""

  if (tabs.length < 2) {
    tabsList.innerHTML = '<div class="text-slate-400">Must have at least 2 tabs open</div>';
    return;
  }

  tabs.forEach((tab, index) => {
    const tabDiv = document.createElement("div");
    tabDiv.className = "flex flex-row items-center justify-between";

    const tabInfo = document.createElement("div");
    tabInfo.className = "flex flex-row gap-2";

    const tIndex = document.createElement("div");
    tIndex.className = "text-white font-light text-sm min-h-full flex items-center justify-center border-r border-slate-600 max-w-10 min-w-10 py-2";
    tIndex.textContent =  index;


    const tabTitle = document.createElement("div");
    tabTitle.className = "text-white font-medium min-h-full flex items-center justify-center ";
    tabTitle.textContent =  tab.title || "New Tab";

    const tabStatus = document.createElement("div");
    tabStatus.className = `text-sm min-h-full ${tab.isActive ? "text-slate-100" : "text-slate-500"} flex items-center justify-center `;
    tabStatus.textContent = tab.isActive ? "Active" : "Hibernated";


    tabInfo.appendChild(tIndex);
    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(tabStatus);

    const hibernateBtn = document.createElement("button");
    hibernateBtn.className = ` rounded-md text-sm font-light ${tab.isActive ? `bg-red-700/40` : `bg-slate-700/40`} transition-all duration-100 px-4 py-1 text-white`;

    hibernateBtn.textContent = tab.isActive ? "Hibernate" : "Hibernated";
    hibernateBtn.disabled = !tab.isActive;

    if (tab.isActive) {
      hibernateBtn.onclick = () => {
        window.electronAPI.hibernateTab(index);
      };
    }

    tabDiv.appendChild(tabInfo);
    tabDiv.appendChild(hibernateBtn);
    tabsList.appendChild(tabDiv);

  });
};