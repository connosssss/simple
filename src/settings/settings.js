const tabsList = document.getElementById("tabs-list");


// Need to use a prev state bacuse 
let prevTabState = [];
let closeAfter = parseInt(localStorage.getItem("closeAfter")) || 10;
let defaultSite = "https://google.com";

window.electronAPI.onUpdateTabs((tabs) => {
  renderTabs(tabs);
  prevTabState = tabs;


});



const closeAfterSelect = document.getElementById("close-after-select");
if (closeAfterSelect) {
  closeAfterSelect.value = closeAfter;
  
  closeAfterSelect.addEventListener("change", (e) => {
    closeAfter = parseInt(e.target.value);
    localStorage.setItem("closeAfter", closeAfter);
    renderTabs(prevTabState);
    console.log(closeAfter);
  });
}



const getTimeTabActive = (lastActive) => {
  if (!lastActive) return -1;

  const now = Date.now();
  const dur = now - lastActive;

  const s = Math.floor(dur / 1000);
  const m = Math.floor(s/60);

  return m;

}

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
    tIndex.textContent =  index + 1;


    const tabTitle = document.createElement("div");
    tabTitle.className = "text-white font-medium min-h-full flex items-center justify-center ";
    tabTitle.textContent =  tab.title || "New Tab";

    const tabStatus = document.createElement("div");
    tabStatus.className = `text-sm min-h-full ${tab.isActive ? "text-slate-100" : "text-slate-500"} flex items-center justify-center `;
    tabStatus.textContent = tab.isActive ? "Active" : "Hibernated";

    const tabDur = document.createElement("div");
    tabDur.className = "text-sm font-light text-slate-400/80 min-h-full flex items-center justify-center ";

    //CLOSING TABS AFTER OPEN TOO LONG
    tabDuration = getTimeTabActive(tab.lastActiveAt);
    tabDur.textContent = tabDuration;
    if(tabDuration > closeAfter && closeAfter != -1 && tab.isActive && !tab.keepActive){
      window.electronAPI.hibernateTab(index);

    }

    tabInfo.appendChild(tIndex);
    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(tabStatus);
    tabInfo.appendChild(tabDur);

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

setInterval(() => {
  renderTabs(prevTabState);
}, 1000);


const siteChoice = document.getElementById("siteChoiceBar");


siteChoice.addEventListener("keydown", (event) => {
        if (event.key == "Enter") {
            event.preventDefault();
            defaultSite = siteChoice.value;
            window.electronAPI.updateDefaultSite(defaultSite);
        }
    });

window.electronAPI.onInitSettings((settings) => {
  if (settings.defaultSite) {
    defaultSite = settings.defaultSite;
    document.getElementById("siteChoiceBar").value = defaultSite;
  }
});