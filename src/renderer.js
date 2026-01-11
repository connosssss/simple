



document.getElementById("new-tab").onclick = () => {
    window.electronAPI.createTab()
}





const tabsList = document.getElementById("tabs-list");



window.electronAPI.onUpdateTabs((tabs) => {
    renderTabs(tabs);
});


const renderTabs = (tabs) => { 
    tabsList.innerHTML = "";

    tabs.forEach((tab, index) => {
        const tabE = document.createElement("div");
        tabE.className = `flex items-center px-4 cursor-pointer ${tab.isActive ? `bg-slate-600 hover:bg-slate-500` : `bg-slate-800 hover:bg-slate-700`} text-white `;
        tabE.textContent = tab.title || "New Tab";

        tabE.onclick = () => {
            window.electronAPI.switchTab(index);
        }

        tabsList.appendChild(tabE)
    })
}