


const tabsList = document.getElementById("tabs-list");

export const renderTabs = (tabs) => {
    tabsList.innerHTML = "";

    tabs.forEach((tab, index) => {
        const tabE = document.createElement("div");
        tabE.className = `flex items-center px-4 cursor-pointer text-white ${tab.isMainTab ? `bg-slate-700 hover:bg-slate-600` : tab.isActive ? `bg-slate-800 hover:bg-slate-700` : `bg-slate-800/50 hover:bg-slate-700/50 text-slate-600`} 
         flex-1 min-w-0 max-w-[10rem] mb-0 rounded-t-sm h-full transition-all duration-100`;
        tabE.title = tab.title || "Tab"

        const titleSpan = document.createElement("span");
        titleSpan.className = "truncate flex-1 overflow-hidden pointer-events-none text-sm";
        titleSpan.textContent = tab.title || "New Tab";
        tabE.appendChild(titleSpan);




        tabE.draggable = true;
        tabE.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", index);
        };

        tabE.ondragover = (e) => { e.preventDefault(); };
        tabE.ondrop = (e) => {
            e.preventDefault();
            const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
            if (startingIndex !== index) {
                window.electronAPI.reorderTabs(startingIndex, index);
            }
        };



        tabE.addEventListener("contextmenu", (event) => {
            event.preventDefault()
            window.electronAPI.showContextMenu({
                x: event.clientX,
                y: event.clientY,
                tabIndex: index
            });
        })

        const closeB = document.createElement("button");
        closeB.className = `${tab.isMainTab ? `bg-slate-900 hover:bg-slate-800` : `bg-slate-900/80 hover:bg-slate-800`} transition-all duration-100 text-white rounded-sm text-xs font-bold  flex-shrink-0 ml-2 px-1`;
        closeB.textContent = "×";
        closeB.onclick = (e) => {
            e.stopPropagation();
            window.electronAPI.closeTab(index);
        }

        tabE.appendChild(closeB);

        tabE.onclick = () => {
            window.electronAPI.switchTab(index);
        }

        tabsList.appendChild(tabE);
    });
}