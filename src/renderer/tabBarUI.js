const tabsList = document.getElementById("tabs-list");
const stackTabsBar = document.getElementById("stack-tabs-bar");
const stackTabsList = document.getElementById("stack-tabs-list");
const newStackTabButton = document.getElementById("new-stack-tab");

let activeStackId = null;
const lastActiveStackTab = new Map();


const selectedTabIds = new Set();
let lastClickedTabId = null;
let prevActiveTabId = null;

newStackTabButton?.addEventListener("click", (event) => {
    event.stopPropagation();

    if (!activeStackId) return;

    window.electronAPI.createTab({
        switchTo: true,
        isStacked: true,
        stackId: activeStackId
    });
});

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
    if (!Number.isNaN(startingIndex) && latestTabs) {
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

function startInlineStackRename(container, stackId, currentName) {
    container.innerHTML = "";

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

    container.appendChild(input);
    input.focus();
    input.select();
}



window.electronAPI.onPromptStackName((data) => {
    const { stackId, currentName } = data;

    const toggleBtn = document.querySelector(`[data-stack-id="${stackId}"]`);
    if (!toggleBtn) return;

    startInlineStackRename(toggleBtn, stackId, currentName);
});


export const renderTabs = (tabs) => {
    latestTabs = tabs;

    const currentIds = new Set(tabs.map(t => t.id));
    for (const id of selectedTabIds) {
        if (!currentIds.has(id)) {
            selectedTabIds.delete(id);
        }
    }

    const mainTab = tabs.find(t => t.isMainTab);
    const mainTabId = mainTab ? mainTab.id : null;

    if (mainTabId) {

        if (mainTabId !== prevActiveTabId) {
            if (!selectedTabIds.has(mainTabId)) {
                selectedTabIds.clear();
                selectedTabIds.add(mainTabId);
            }
            prevActiveTabId = mainTabId;
        }
    }


    if (selectedTabIds.size === 0 && mainTabId) {
        selectedTabIds.add(mainTabId);
    }

    tabsList.innerHTML = "";
    stackTabsList.innerHTML = "";

    const renderedStacks = new Set();
    const currentStackId = mainTab && mainTab.isStacked ? mainTab.stackId : null;

    if (currentStackId) {
        activeStackId = currentStackId;
        lastActiveStackTab.set(currentStackId, mainTab.index);
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

            stackContainer.className = `flex items-center px-3 cursor-pointer ${bgClass} min-w-0 max-w-[10rem] mb-0 rounded-t-s h-8 transition-all duration-100 gap-1 flex-shrink-0 group-[.layout-left]:w-full group-[.layout-right]:w-full group-[.layout-left]:max-w-none group-[.layout-right]:max-w-none group-[.layout-left]:flex-none group-[.layout-right]:flex-none group-[.layout-left]:px-2 group-[.layout-right]:px-2`;
            stackContainer.setAttribute("data-stack-id", tab.stackId);
            stackContainer.dataset.themeState = isActiveStack ? "active" : "idle";


            const nameSpan = document.createElement("span");
            nameSpan.className = "truncate flex-1 overflow-hidden text-sm";
            nameSpan.textContent = tab.stackName || "Stack";
            stackContainer.appendChild(nameSpan);

            const countBadge = document.createElement("span");
            countBadge.className = "text-[10px] opacity-50 flex-shrink-0 pointer-events-none";
            countBadge.textContent = stackTabs.length;
            stackContainer.appendChild(countBadge);

            const closeB = document.createElement("button");
            closeB.className = `hover:bg-slate-700/60 p-0.5 rounded transition-all duration-100 text-slate-300 hover:text-white flex-shrink-0 ml-2 flex items-center justify-center w-4 h-4`;
            closeB.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-3 h-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            `;
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

            let clickTimer = null;

            stackContainer.addEventListener("click", (e) => {
              e.stopPropagation();
              if (clickTimer) return;

              clickTimer = setTimeout(() => {
                clickTimer = null;

                if (activeStackId === tab.stackId) {
                    activeStackId = null;
                    renderTabs(tabs);
                }

                else {
                    const rememberedIndex = lastActiveStackTab.get(tab.stackId);
                    const targetTab = rememberedIndex != null ? stackTabs.find(st => st.index === rememberedIndex): null;
                    const tabToSwitch = targetTab || stackTabs[0];
                  
                    if (tabToSwitch) {
                        window.electronAPI.switchTab(tabToSwitch.index);
                    }
                  
                }
              }, 250);
            });

            stackContainer.addEventListener("dblclick", (e) => {
              e.stopPropagation();
              if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
              }
              startInlineStackRename(stackContainer, tab.stackId, tab.stackName);
            });

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

            const isSidebar = document.body.classList.contains('layout-left') || document.body.classList.contains('layout-right');
            if (isSidebar) {
                if (isActiveStack) {
                    stackTabs.forEach(({ tab: stTab, index: stIndex }) => {
                        const tabE = createTabElement(stTab, stIndex, true, tabs);
                        tabE.classList.add(
                            'group-[.layout-left]:ml-[16px]',
                            'group-[.layout-left]:w-[calc(100%-16px)]',
                            'group-[.layout-left]:border-l-2',
                            'group-[.layout-left]:border-[var(--theme-border)]',
                            'group-[.layout-left]:rounded-l-none',
                            'group-[.layout-right]:ml-[16px]',
                            'group-[.layout-right]:w-[calc(100%-16px)]',
                            'group-[.layout-right]:border-l-2',
                            'group-[.layout-right]:border-[var(--theme-border)]',
                            'group-[.layout-right]:rounded-l-none'
                        );
                        tabsList.appendChild(tabE);
                    });
                }
            } 
            
            else {
                if (isActiveStack) {
                    renderStackTabsBar(stackTabs, tabs);
                }
            }
        }

        else {
            tabsList.appendChild(createTabElement(tab, index, false, tabs));
        }
    });

    const isSidebar = document.body.classList.contains('layout-left') || document.body.classList.contains('layout-right');
    if (activeStackId && !isSidebar) {
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
        const isSelected = selectedTabIds.has(tab.id);
        const iconColor = "text-slate-400";

        if (isSelected) {
            bgClass = "bg-white/35 hover:bg-white/45 text-white";
        }
        
        else if (tab.isMainTab) {
            bgClass = "bg-slate-700/50 hover:bg-slate-600 text-white";
        }

        else if (tab.isActive) {
            bgClass = "bg-slate-800/50 hover:bg-slate-700 text-white";
        }

        else {
            bgClass = "bg-slate-800/25 hover:bg-slate-700/50 text-slate-600";
        }


        tabE.className = `flex items-center px-2 cursor-pointer ${bgClass} flex-1 min-w-0 max-w-[10rem] mb-0 rounded-t-sm h-8 transition-all duration-100 gap-2 group-[.layout-left]:w-full group-[.layout-right]:w-full group-[.layout-left]:max-w-none group-[.layout-right]:max-w-none group-[.layout-left]:flex-none group-[.layout-right]:flex-none`;
        tabE.dataset.themeState = isSelected ? "selected" : tab.isMainTab ? "main" : tab.isActive ? "active" : "resting";

        tabE.title = tab.title || "Tab";

        const appendTabIcon = () => {
            if (tab.isSettingsTab || tab.address === "about://settings") {
                const settingsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                settingsSvg.setAttribute("viewBox", "0 0 24 24");
                settingsSvg.setAttribute("fill", "none");
                settingsSvg.setAttribute("stroke", "currentColor");
                settingsSvg.setAttribute("stroke-width", "1.5");
                settingsSvg.setAttribute("class", `tab-icon w-4 h-4 ${iconColor} flex-shrink-0 pointer-events-none`);
                settingsSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128c.332-.183.582-.495.645-.869L9.594 3.94ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />`;
                tabE.appendChild(settingsSvg);
                return;
            }

            if (tab.address === "about://history") {
                const historySvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                historySvg.setAttribute("viewBox", "0 0 24 24");
                historySvg.setAttribute("fill", "none");
                historySvg.setAttribute("stroke", "currentColor");
                historySvg.setAttribute("stroke-width", "1.5");
                historySvg.setAttribute("class", `tab-icon w-4 h-4 ${iconColor} flex-shrink-0 pointer-events-none`);
                historySvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />`;
                tabE.appendChild(historySvg);
                return;
            }

            let domain = "";
            try {
                if (tab.address && !tab.address.startsWith("about:")) {
                    domain = new URL(tab.address).hostname;
                }
            } catch (e) {
                domain = "";
            }

            const iconSrc = tab.iconURL || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : "");

            if (iconSrc) {
                const icon = document.createElement("img");
                icon.className = "tab-icon w-4 h-4 flex-shrink-0 pointer-events-none opacity-75 rounded-sm";
                icon.src = iconSrc;
                icon.onerror = () => {
                    const docSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    docSvg.setAttribute("viewBox", "0 0 24 24");
                    docSvg.setAttribute("fill", "none");
                    docSvg.setAttribute("stroke", "currentColor");
                    docSvg.setAttribute("stroke-width", "1.5");
                    docSvg.setAttribute("class", `tab-icon w-4 h-4 ${iconColor} flex-shrink-0 pointer-events-none`);
                    docSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />`;
                    icon.replaceWith(docSvg);
                };
                tabE.appendChild(icon);
            } else {
                const docSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                docSvg.setAttribute("viewBox", "0 0 24 24");
                docSvg.setAttribute("fill", "none");
                docSvg.setAttribute("stroke", "currentColor");
                docSvg.setAttribute("stroke-width", "1.5");
                docSvg.setAttribute("class", `tab-icon w-4 h-4 ${iconColor} flex-shrink-0 pointer-events-none`);
                docSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />`;
                tabE.appendChild(docSvg);
            }
        };
        appendTabIcon();
        
    



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
            event.preventDefault();
            event.stopPropagation();
            
            const tabId = tab.id;
            if (!selectedTabIds.has(tabId)) {
                selectedTabIds.clear();
                selectedTabIds.add(tabId);
                lastClickedTabId = tabId;
                window.electronAPI.switchTab(index);
            }
            
            const selectedIndices = tabs
                .map((t, idx) => selectedTabIds.has(t.id) ? idx : -1)
                .filter(idx => idx !== -1);
                
            window.electronAPI.showContextMenu({
                x: event.clientX,
                y: event.clientY,
                tabIndex: index,
                selectedIndices: selectedIndices
            });
        });

  
  
  
        //displaying tabs
        const closeB = document.createElement("button");
        closeB.className = `hover:bg-slate-700/60 p-0.5 rounded transition-all duration-100 text-slate-300 hover:text-white flex-shrink-0 ml-2 flex items-center justify-center w-4 h-4`;
        closeB.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-3 h-3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        `;
        closeB.onclick = (e) => {
            e.stopPropagation();
            window.electronAPI.closeTab(index);
        }

        tabE.appendChild(closeB);

        //
        tabE.onclick = (e) => {
            const tabId = tab.id;
            
            if (e.ctrlKey || e.metaKey) {
                if (selectedTabIds.has(tabId)) {
                    if (selectedTabIds.size > 1) {
                        selectedTabIds.delete(tabId);
                        if (tab.isMainTab) {
                            const otherId = Array.from(selectedTabIds)[0];
                            const otherIndex = tabs.findIndex(t => t.id === otherId);
                            if (otherIndex !== -1) {
                                window.electronAPI.switchTab(otherIndex);
                            }
                        }
                    }
                } else {
                    selectedTabIds.add(tabId);
                }
                renderTabs(tabs);
            } 
            
            else if (e.shiftKey) {
                // Range selection
                let fromIndex = tabs.findIndex(t => t.id === lastClickedTabId);
                if (fromIndex === -1) {
                    fromIndex = tabs.findIndex(t => t.isMainTab);
                }
                if (fromIndex !== -1) {
                    const toIndex = index;
                    const start = Math.min(fromIndex, toIndex);
                    const end = Math.max(fromIndex, toIndex);
                    
                    selectedTabIds.clear();
                    for (let i = start; i <= end; i++) {
                        selectedTabIds.add(tabs[i].id);
                    }
                }
                lastClickedTabId = tabId;
                window.electronAPI.switchTab(index);
            } 
            
            else {
                // Normal click
                selectedTabIds.clear();
                selectedTabIds.add(tabId);
                lastClickedTabId = tabId;
                window.electronAPI.switchTab(index);
            }
        };

        return tabE;
}
