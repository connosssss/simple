



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
        tabE.draggable = true;

        tabE.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", index);
        };

        tabE.ondragover = (e) => {
            e.preventDefault();
        };

        tabE.ondrop = (e) => {
            e.preventDefault();

            const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));

            if (startingIndex !== index) {
                window.electronAPI.reorderTabs(startingIndex, index);
            }
        };

        const closeB = document.createElement("button");

        closeB.className = "bg-gray-700 hover:bg-gray-600 text-white rounded-sm  text-md font-bold px-2";
        closeB.textContent = "×";

        closeB.onclick = (e) => {
            console.log(`Closing tab ${index}`);
            e.stopPropagation();
            window.electronAPI.closeTab(index);
        }

        tabE.appendChild(closeB);

        tabE.onclick = () => {
            window.electronAPI.switchTab(index);
        }

        tabsList.appendChild(tabE)
    })
}