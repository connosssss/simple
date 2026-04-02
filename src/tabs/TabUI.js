const tabsList = document.getElementById("tabs-list");


const stackColors = [
    'border-b-blue-500', 'border-b-red-500', 'border-b-green-500', 
    'border-b-yellow-500', 'border-b-purple-500', 'border-b-pink-500', 
    'border-b-teal-500', 'border-b-indigo-500'
];

const collapsedStacks = new Set();

tabsList.ondragover = (e) => { e.preventDefault(); };

tabsList.ondrop = (e) => {
    e.preventDefault();
    const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(startingIndex)) {
        window.electronAPI.removeFromStack(startingIndex);
        window.electronAPI.reorderTabs(startingIndex, 1000);
    }
};

  

function getStackColor(stackId) {

    if (!stackId) return "";
    let hash = 0;

    for (let i = 0; i < stackId.length; i++) {
     hash = stackId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % stackColors.length;
    return stackColors[index];
}



export const renderTabs = (tabs) => {
    tabsList.innerHTML = "";
    const renderedStacks = new Set();

    tabs.forEach((tab, index) => {

        if (tab.isStacked && renderedStacks.has(tab.stackId)) return;

        if (tab.isStacked) {
            renderedStacks.add(tab.stackId);

            const stackContainer = document.createElement("div");
            const stackColor = getStackColor(tab.stackId);
            const isCollapsed = collapsedStacks.has(tab.stackId);
            stackContainer.className = `flex flex-row items-end h-full border-b-2 ${stackColor} rounded-t-sm overflow-hidden`;


            const stackTabs = tabs.map((t, i) => ({ tab: t, index: i })).filter(entry => entry.tab.stackId === tab.stackId);

            const toggleBtn = document.createElement("button");
            toggleBtn.className = "flex items-center justify-center px-3 h-full bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-100 text-xs flex-shrink-0";
           // toggleBtn.title = isCollapsed ? "Expand group" : "Collapse group";


            toggleBtn.onclick = (e) => {
                e.stopPropagation();

                if (collapsedStacks.has(tab.stackId)) {
                    collapsedStacks.delete(tab.stackId);
                } 
                
                else {
                    collapsedStacks.add(tab.stackId);
                }
                renderTabs(tabs);
            };




            stackContainer.appendChild(toggleBtn);

            if (isCollapsed) {
                const activeEntry = stackTabs.find(e => e.tab.isActive || e.tab.isMainTab) || stackTabs[0];
                stackContainer.appendChild(createTabElement(activeEntry.tab, activeEntry.index, true, tabs));

                
                const badge = document.createElement("span");
                badge.className = "flex items-center justify-center h-full bg-slate-800/50 flex-shrink-0 pointer-events-none";
                stackContainer.appendChild(badge);

            } 
            
            else {
                stackTabs.forEach(({ tab: sTab, index: sIndex }) => {
                    stackContainer.appendChild(createTabElement(sTab, sIndex, true, tabs));
                });
            }

            tabsList.appendChild(stackContainer);
        } 
        
        else {
            tabsList.appendChild(createTabElement(tab, index, false, tabs));
        }
    });
};

function createTabElement(tab, index, isInStack, tabs) {
        const tabE = document.createElement("div");
        tabE.className = `flex items-center px-4 cursor-pointer text-white ${tab.isMainTab ? `bg-slate-700 hover:bg-slate-600` : tab.isActive ? `bg-slate-800 hover:bg-slate-700` : `bg-slate-800/50 hover:bg-slate-700/50 text-slate-600`} 
        
         flex-1 min-w-0 max-w-[10rem] mb-0 rounded-t-sm h-full transition-all duration-100`;
        tabE.title = tab.title || "Tab";



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
            e.stopPropagation();
            const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));


            if (startingIndex !== index) {
                const rect = tabE.getBoundingClientRect();
                const x = e.clientX - rect.left;

                if (x > rect.width * 0.25 && x < rect.width * 0.75) {
                    
                    if (tab.isStacked){
                        window.electronAPI.updateStack(tab.stackId, startingIndex);
                    }

                    else{
                        window.electronAPI.createStack([startingIndex, index]);
                    }

                }
                else {
                    const startingTab = tabs && tabs[startingIndex] ? tabs[startingIndex] : null;

                    if (startingTab && startingTab.isStacked && startingTab.stackId !== tab.stackId) {
                        window.electronAPI.removeFromStack(startingIndex);
                    }
                    
                    window.electronAPI.reorderTabs(startingIndex, index);
                }

            }
                
        };

        tabE.ondragend = (e) => {
            if (e.screenX < window.screenX || e.screenX > window.screenX + window.outerWidth ||
                e.screenY < window.screenY || e.screenY > window.screenY + window.outerHeight) {
                window.electronAPI.tabTransfer(index, e.screenX, e.screenY);
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

        return tabE;
}