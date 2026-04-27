const tabsList = document.getElementById("tabs-list");
const stackTabsBar = document.getElementById("stack-tabs-bar");
const stackTabsList = document.getElementById("stack-tabs-list");

let activeStackId = null;

tabsList.ondragover = (e) => { e.preventDefault(); };


stackTabsBar.ondragover = (e) => {
    if (activeStackId) e.preventDefault();
};

stackTabsBar.ondrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeStackId) return;

    const dragStackId = e.dataTransfer.getData("application/stack-id");
    
    if (dragStackId) return; 

    const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (!startingIndex && latestTabs) {
        const startingTab = latestTabs[startingIndex];
        if (startingTab && startingTab.stackId !== activeStackId) {
            window.electronAPI.updateStack(activeStackId, startingIndex);
        }
    }
};

tabsList.ondrop = (e) => {
    e.preventDefault();
  const dragStackId = e.dataTransfer.getData("application/stack-id");
  
    if (dragStackId) {
        window.electronAPI.reorderStack(dragStackId, 1000);
        return;
    }

    const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(startingIndex)) {
        window.electronAPI.removeFromStack(startingIndex);
        window.electronAPI.reorderTabs(startingIndex, 1000);
    }
};

let latestTabs = null;

window.electronAPI.onPromptStackName((data) => {
    const { stackId, currentName } = data;

    const toggleBtn = document.querySelector(`[data-stack-id="${stackId}"]`);
    if (!toggleBtn) return;

    toggleBtn.innerHTML = "";


    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName || "";
    input.placeholder = "Stack name...";
    input.className = "bg-slate-700 text-white text-xs px-1 outline-none w-20 min-w-[60px] max-w-[100px]";


    const commit = () => {
        window.electronAPI.renameStack(stackId, input.value);
    };

    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
            commit();
            input.blur();
        }

        else if (e.key === "Escape") {
            if (latestTabs) renderTabs(latestTabs);
        }
    });

    input.addEventListener("blur", () => {
        commit();
    });

    toggleBtn.appendChild(input);
    input.focus();
    input.select();
});


export const renderTabs = (tabs) => {
    latestTabs = tabs;
    tabsList.innerHTML = "";
    stackTabsList.innerHTML = "";

    const renderedStacks = new Set();

    const mainTab = tabs.find(t => t.isMainTab);
    const currentStackId = mainTab && mainTab.isStacked ? mainTab.stackId : null;

    if (currentStackId) {
        activeStackId = currentStackId;
    }
    
    else {
        activeStackId = null;
    }

    tabs.forEach((tab, index) => {

        if (tab.isStacked && renderedStacks.has(tab.stackId)) return;

        if (tab.isStacked) {
            renderedStacks.add(tab.stackId);

            const stackTabs = tabs.map((t, i) => ({ tab: t, index: i })).filter(entry => entry.tab.stackId === tab.stackId);
            const isActiveStack = tab.stackId === activeStackId;

            const stackContainer = document.createElement("div");
            const bgClass = isActiveStack
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-800/50 hover:bg-slate-700/50 text-slate-400";

            stackContainer.className = `flex items-center px-3 cursor-pointer ${bgClass} min-w-0 max-w-[10rem] mb-0 rounded-t-sm h-full transition-all duration-100 gap-1 flex-shrink-0`;
            stackContainer.setAttribute("data-stack-id", tab.stackId);
            stackContainer.dataset.themeState = isActiveStack ? "active" : "idle";


            const nameSpan = document.createElement("span");
            nameSpan.className = "truncate flex-1 overflow-hidden pointer-events-none text-sm";
            nameSpan.textContent = tab.stackName || "Stack";
            stackContainer.appendChild(nameSpan);

            const countBadge = document.createElement("span");
            countBadge.className = "text-[10px] opacity-50 flex-shrink-0 pointer-events-none";
            countBadge.textContent = stackTabs.length;
            stackContainer.appendChild(countBadge);

            const closeB = document.createElement("button");
            closeB.className = `bg-slate-900/80 hover:bg-slate-800 transition-all duration-100 text-white rounded-sm text-xs font-bold flex-shrink-0 ml-2 px-1`;
            closeB.textContent = "×";
            closeB.onclick = (e) => {
                e.stopPropagation();
                window.electronAPI.closeStack(tab.stackId);
            };
            stackContainer.appendChild(closeB);

            stackContainer.draggable = true;
            stackContainer.ondragstart = (e) => {
                e.dataTransfer.setData("application/stack-id", tab.stackId);
            };

            stackContainer.ondragover = (e) => { e.preventDefault(); };

            stackContainer.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();

              const dragStackId = e.dataTransfer.getData("application/stack-id");
              
                if (dragStackId) {
                    if (dragStackId !== tab.stackId) {
                         window.electronAPI.reorderStack(dragStackId, index);
                    }
                  
                    return;
                }

                const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
                if (!isNaN(startingIndex)) {
                     const startingTab = tabs && tabs[startingIndex] ? tabs[startingIndex] : null;

                     if (startingTab && startingTab.stackId !== tab.stackId) {
                         window.electronAPI.updateStack(tab.stackId, startingIndex);
                     }
                  
                }
            };

            stackContainer.onclick = (e) => {
                e.stopPropagation();
                if (activeStackId === tab.stackId) {
                    activeStackId = null;
                    renderTabs(tabs);
                } else {
                    const firstTab = stackTabs[0];
                    if (firstTab) {
                        window.electronAPI.switchTab(firstTab.index);
                    }
                }
            };

            stackContainer.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();

                window.electronAPI.showStackContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    stackId: tab.stackId
                });

            });

            tabsList.appendChild(stackContainer);

            if (isActiveStack) {
                renderStackTabsBar(stackTabs, tabs);
            }
        }

        else {
            tabsList.appendChild(createTabElement(tab, index, false, tabs));
        }
    });

    if (activeStackId) {
        stackTabsBar.classList.remove("hidden");
        stackTabsBar.classList.add("flex");
        window.electronAPI.stackBarVisible(true);
    } else {
        stackTabsBar.classList.add("hidden");
        stackTabsBar.classList.remove("flex");
        window.electronAPI.stackBarVisible(false);
    }
};


function renderStackTabsBar(stackTabs, allTabs) {
    stackTabsList.innerHTML = "";

    stackTabs.forEach(({ tab, index }) => {
        const tabE = createTabElement(tab, index, true, allTabs);
        stackTabsList.appendChild(tabE);
    });
}


function createTabElement(tab, index, isInStack, tabs) {
        const tabE = document.createElement("div");
        let bgClass = "bg-slate-800/50 hover:bg-slate-700/50 text-slate-400";


        if (tab.isMainTab) {
            bgClass = "bg-slate-700/50 hover:bg-slate-600 text-white";
        }

        else if (tab.isActive) {
            bgClass = "bg-slate-800/50 hover:bg-slate-700 text-white";
        }

        else {
            bgClass = "bg-slate-800/25 hover:bg-slate-700/50 text-slate-600";
        }
        tabE.className = `flex items-center px-4 cursor-pointer ${bgClass} flex-1 min-w-0 max-w-[10rem] mb-0 rounded-t-sm h-full transition-all duration-100`
        tabE.dataset.themeState = tab.isMainTab ? "main" : tab.isActive ? "active" : "resting";

        tabE.title = tab.title || "Tab";



        const titleSpan = document.createElement("span");
        titleSpan.className = "truncate flex-1 overflow-hidden pointer-events-none text-sm";
        titleSpan.textContent = tab.title || "New Tab";
        tabE.appendChild(titleSpan);



        /*
        
       TAB DRAGGING
      
       */
        tabE.draggable = true;
        tabE.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", index);
        };

        tabE.ondragover = (e) => { e.preventDefault(); };


        tabE.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const dragStackId = e.dataTransfer.getData("application/stack-id");
            
          
            if (dragStackId) {
                window.electronAPI.reorderStack(dragStackId, index);
                return;
            }

            const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));

            if (startingIndex !== index) {
              const rect = tabE.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

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
                return;
            }

          if (activeStackId && !isInStack) {
              
              const stackBarRect = stackTabsBar.getBoundingClientRect();
            const clientY = e.clientY;
            
              if (clientY >= stackBarRect.top && clientY <= stackBarRect.bottom &&
                e.clientX >= stackBarRect.left && e.clientX <= stackBarRect.right) {
                
                const tab = latestTabs && latestTabs[index];
                
                if (tab && tab.stackId !== activeStackId) {
                  window.electronAPI.updateStack(activeStackId, index);
                 }
                }
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

  
  
  
        //displaying tabs
        const closeB = document.createElement("button");
        closeB.className = `${tab.isMainTab ? `bg-slate-900 hover:bg-slate-800` : `bg-slate-900/80 hover:bg-slate-800`} transition-all duration-100 text-white rounded-sm text-xs font-bold  flex-shrink-0 ml-2 px-1`;
        closeB.textContent = "×";
        closeB.onclick = (e) => {
            e.stopPropagation();
            window.electronAPI.closeTab(index);
        }

        tabE.appendChild(closeB);

        //
        tabE.onclick = (e) => {
            window.electronAPI.switchTab(index);
        }

        return tabE;
}
