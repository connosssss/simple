const tabsList = document.getElementById("tabs-list");

window.electronAPI.onUpdateTabs((tabs) => {
  renderTabs(tabs);
});


const renderTabs = (tabs) => {

  tabsList.innerHTML = "";

  if (tabs.length === 0) {
    tabsList.innerHTML = '<div class="text-slate-400">No tabs available</div>';
    return;
  }

  tabs.forEach((tab, index) => {
    const tabDiv = document.createElement("div");
    tabDiv.className = "flex items-center justify-between bg-red-200";

    const tabInfo = document.createElement("div");
    tabInfo.className = "flex-1";


    const tabTitle = document.createElement("div");
    tabTitle.className = "text-white font-medium";
    tabTitle.textContent = tab.title || "New Tab";

    const tabStatus = document.createElement("div");
    tabStatus.className = "text-sm " + (tab.isActive ? "text-slate-100" : "text-slate-500");
    tabStatus.textContent = tab.isActive ? "Active" : "Hibernated";



    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(tabStatus);

    const hibernateBtn = document.createElement("button");
    hibernateBtn.className = ` rounded-md text-sm font-medium  `;

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