const tabsList = document.getElementById("tabs-list");
const stackBarsContainer = document.getElementById("stack-bars-container");

let activeStackIds = [];
const collapsedStacks = new Set();


const selectedTabIds = new Set();
let lastClickedTabId = null;
let prevActiveTabId = null;

const previousLoadingState = new Map();
const finishedLoadingTabIds = new Set();

tabsList.ondragover = (e) => { e.preventDefault(); };

tabsList.ondrop = (e) => {
    e.preventDefault();
  const dragStackId = e.dataTransfer.getData("application/stack-id");
  
    if (dragStackId) {
        window.electronAPI.moveStack(dragStackId, []);
        window.electronAPI.reorderStack(dragStackId, 1000);
        return;
    }

    const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(startingIndex)) {
        window.electronAPI.removeFromStack(startingIndex, 0);
        window.electronAPI.reorderTabs(startingIndex, 1000);
    }
};

let latestTabs = null;
let tabHoverCard = null;

const tabMemoryText = (tab) => tab.memoryText || "0 MB";

const setTabHoverVisible = (visible) => {
    if (window.electronAPI?.setTabHoverVisible) {
        window.electronAPI.setTabHoverVisible(visible);
    }
};

function showTabHoverCard(tabElement, tab) {
    setTabHoverVisible(true);

    if (!tabHoverCard) {
        tabHoverCard = document.createElement("div");
        tabHoverCard.className = "tab-hover-card";
        tabHoverCard.innerHTML = `<div class="tab-hover-title"></div><div class="tab-hover-memory"></div>`;
        document.body.appendChild(tabHoverCard);
    }

    tabHoverCard.querySelector(".tab-hover-title").textContent = tab.title || "New Tab";
    tabHoverCard.querySelector(".tab-hover-memory").textContent = `RAM: ${tabMemoryText(tab)}`;
    tabHoverCard.classList.add("visible");

    const rect = tabElement.getBoundingClientRect();
    const cardRect = tabHoverCard.getBoundingClientRect();
    const top = document.body.classList.contains("layout-bottom")
        ? rect.top - cardRect.height - 6
        : rect.bottom + 6;
    const maxLeft = Math.max(8, window.innerWidth - cardRect.width - 8);
    const left = Math.min(Math.max(rect.left, 8), maxLeft);

    tabHoverCard.style.left = `${left}px`;
    tabHoverCard.style.top = `${Math.max(top, 8)}px`;
}

function hideTabHoverCard() {
    if (tabHoverCard) {
        tabHoverCard.classList.remove("visible");
    }
    setTabHoverVisible(false);
}

document.addEventListener("mouseleave", hideTabHoverCard);

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


export const renderTabs = (tabs, stackLastVisited = {}) => {
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
    if (stackBarsContainer) {
        stackBarsContainer.innerHTML = "";
    }

    if (mainTab && mainTab.isStacked && mainTab.stackIds) {
        activeStackIds = [...mainTab.stackIds];
    }
    
    else {
        activeStackIds = [];
    }

    const isSidebar = document.body.classList.contains('layout-left') || document.body.classList.contains('layout-right');

    const renderLevel = (level, container, parentStackIds) => {
        const renderedStacks = new Set();
        const currentActiveStackId = activeStackIds.length > level ? activeStackIds[level] : null;

        const tabsAtLevel = tabs.filter(t => {
            for (let i = 0; i < level; i++) {
                if (!t.stackIds || t.stackIds[i] !== parentStackIds[i]) return false;
            }
            return true;
        });

        tabsAtLevel.forEach((tab) => {
            const globalIndex = tabs.indexOf(tab);
            const stackIdAtLevel = tab.stackIds && tab.stackIds.length > level ? tab.stackIds[level] : null;

            if (stackIdAtLevel) {
                if (renderedStacks.has(stackIdAtLevel)) return;
                renderedStacks.add(stackIdAtLevel);

                const stackTabs = tabsAtLevel.filter(t => t.stackIds && t.stackIds[level] === stackIdAtLevel);
                const isActiveStack = stackIdAtLevel === currentActiveStackId;

                const stackContainer = document.createElement("div");
                const bgClass = isActiveStack
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-slate-800/50 hover:bg-slate-700/50 text-slate-400";

                stackContainer.className = `relative flex items-center px-3 cursor-pointer ${bgClass} min-w-0 max-w-[10rem] mb-0 rounded-t-s h-8 transition-all duration-100 gap-1 flex-shrink-0 group-[.layout-left]:w-full group-[.layout-right]:w-full group-[.layout-left]:max-w-none group-[.layout-right]:max-w-none group-[.layout-left]:flex-none group-[.layout-right]:flex-none group-[.layout-left]:px-2 group-[.layout-right]:px-2`;
                stackContainer.setAttribute("data-stack-id", stackIdAtLevel);
                stackContainer.dataset.themeState = isActiveStack ? "active" : "idle";

                const isStackLoading = stackTabs.some(st => st.isLoading);

                if (isSidebar) {
                    const chevron = document.createElement("span");
                    const isCollapsed = collapsedStacks.has(stackIdAtLevel);
                    chevron.className = "cursor-pointer flex items-center justify-center w-3 h-3 text-slate-400 hover:text-white transition-transform duration-100 flex-shrink-0 mr-1";
                    chevron.innerHTML = isCollapsed 
                        ? `<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
                        : `<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
                    chevron.onclick = (e) => {
                        e.stopPropagation();
                        if (isCollapsed) {
                            collapsedStacks.delete(stackIdAtLevel);
                        } else {
                            collapsedStacks.add(stackIdAtLevel);
                        }
                        renderTabs(tabs);
                    };
                    stackContainer.appendChild(chevron);
                }

                const nameSpan = document.createElement("span");
                nameSpan.className = "truncate flex-1 overflow-hidden text-sm";
                let sName = tab.stackNames && tab.stackNames[level] ? tab.stackNames[level] : "Stack";
                nameSpan.textContent = sName;
                stackContainer.appendChild(nameSpan);



                const countBadge = document.createElement("span");
                countBadge.className = "text-[10px] opacity-50 flex-shrink-0 pointer-events-none";
                countBadge.textContent = stackTabs.length;
                stackContainer.appendChild(countBadge);





                const closeB = document.createElement("button");
                closeB.className = `hover:bg-slate-700/60 p-0.5 rounded transition-all duration-100 text-slate-300 hover:text-white flex-shrink-0 ml-2 flex items-center justify-center w-4 h-4`;

                closeB.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-3 h-3">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /> </svg>`;

                closeB.onclick = (e) => {
                    e.stopPropagation();
                    window.electronAPI.closeStack(stackIdAtLevel);
                };
                stackContainer.appendChild(closeB);

                stackContainer.draggable = true;
                stackContainer.ondragstart = (e) => {
                    e.dataTransfer.setData("application/stack-id", stackIdAtLevel);
                };

                stackContainer.ondragover = (e) => { e.preventDefault(); };

                stackContainer.ondrop = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                  const dragStackId = e.dataTransfer.getData("application/stack-id");
                  
                    if (dragStackId) {
                        if (dragStackId !== stackIdAtLevel) {
                            const rect = stackContainer.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          
                            if (x > rect.width * 0.25 && x < rect.width * 0.75) {
                                const targetPath = [...parentStackIds, stackIdAtLevel];
                                window.electronAPI.moveStack(dragStackId, targetPath);
                            }

                            else {
                                window.electronAPI.moveStack(dragStackId, parentStackIds);
                                window.electronAPI.reorderStack(dragStackId, globalIndex);
                            }
                        }
                      
                        return;
                    }

                    const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
                    if (!isNaN(startingIndex)) {
                         const targetPath = [...parentStackIds, stackIdAtLevel];
                         window.electronAPI.updateStack(targetPath, startingIndex);
                    }
                };

                let clickTimer = null;

                stackContainer.addEventListener("click", (e) => {
                  e.stopPropagation();
                  if (clickTimer) return;

                  clickTimer = setTimeout(() => {
                    clickTimer = null;

                    if (isSidebar) {
                        const isCollapsed = collapsedStacks.has(stackIdAtLevel);
                        if (isCollapsed) {
                            collapsedStacks.delete(stackIdAtLevel);
                        } else {
                            collapsedStacks.add(stackIdAtLevel);
                        }
                        renderTabs(tabs);
                        return;
                    }

                    if (isActiveStack) {
                        activeStackIds = [...parentStackIds];
                        renderTabs(tabs);
                    }

                    else {
                        const lastVisitedTabId = stackLastVisited[stackIdAtLevel];
                        const targetTab = lastVisitedTabId ? tabs.find(t => t.id === lastVisitedTabId && t.stackIds && t.stackIds[level] === stackIdAtLevel) : null;
                        const tabToSwitch = targetTab || stackTabs[0];
                      
                        if (tabToSwitch) {
                            window.electronAPI.switchTab(tabs.indexOf(tabToSwitch));
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
                  startInlineStackRename(stackContainer, stackIdAtLevel, sName);
                });

                stackContainer.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    window.electronAPI.showStackContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        stackId: stackIdAtLevel
                    });

                });

                if (isSidebar && level > 0) {
                    const indent = level * 16;
                    stackContainer.style.setProperty('margin-left', `${indent}px`, 'important');
                    stackContainer.style.setProperty('width', `calc(100% - ${indent}px)`, 'important');
                    stackContainer.style.setProperty('border-left', '2px solid var(--theme-border)', 'important');
                    stackContainer.style.setProperty('border-top-left-radius', '0px', 'important');
                    stackContainer.style.setProperty('border-bottom-left-radius', '0px', 'important');
                }

                container.appendChild(stackContainer);

                if (isSidebar) {
                    const isCollapsed = collapsedStacks.has(stackIdAtLevel);
                    if (!isCollapsed) {
                        renderLevel(level + 1, container, [...parentStackIds, stackIdAtLevel]);
                    }
                } 
            }

            else {
                container.appendChild(createTabElement(tab, globalIndex, level > 0, tabs, level));
            }
        });

        if (!isSidebar && currentActiveStackId) {
            return currentActiveStackId;
        }
        return null;
    };

    renderLevel(0, tabsList, []);

    if (!isSidebar && stackBarsContainer) {
        let currentParentIds = [];
        let rowsRendered = 0;

        for (let i = 0; i < activeStackIds.length; i++) {
            const nextStackId = activeStackIds[i];
            
            const newBar = document.createElement("div");
            newBar.className = "theme-shell theme-border w-screen flex flex-row backdrop-blur-md h-[40px] items-center justify-start gap-1 border-b border-black/20 stack-tabs-bar transition-all duration-100 group-[.layout-bottom]:order-3 group-[.layout-bottom]:border-b group-[.layout-bottom]:border-[var(--theme-border)] group-[.layout-left]:hidden group-[.layout-right]:hidden";
            
            const newList = document.createElement("div");
            newList.className = "stack-tabs-list flex flex-row overflow-x-hidden gap-1 h-8 items-center ml-1";
            
            const newBtn = document.createElement("button");
            newBtn.className = "new-stack-tab theme-button w-8 h-8 flex items-center justify-center text-white rounded transition-all duration-100 mr-2 active:scale-95";
            newBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            `;
            
            const currentPath = [...currentParentIds, nextStackId];
            newBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                window.electronAPI.createTab({
                    switchTo: true,
                    isStacked: true,
                    stackIds: currentPath
                });
            });
            
            newBar.ondragover = (e) => { e.preventDefault(); };
            newBar.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const dragStackId = e.dataTransfer.getData("application/stack-id");
                if (dragStackId) {
                    window.electronAPI.moveStack(dragStackId, currentPath);
                    return;
                } 

                const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(startingIndex) && latestTabs) {
                    const startingTab = latestTabs[startingIndex];
                    if (startingTab) {
                        window.electronAPI.updateStack(currentPath, startingIndex);
                    }
                }
            };
            
            newBar.appendChild(newList);
            newBar.appendChild(newBtn);
            
            currentParentIds.push(nextStackId);
            renderLevel(i + 1, newList, currentParentIds);
            
            stackBarsContainer.appendChild(newBar);
            rowsRendered++;
        }
        
        window.electronAPI.stackBarsVisible(rowsRendered);
    } 
    
    else {
        window.electronAPI.stackBarsVisible(0);
    }

    const activeTab = tabs.find(t => t.isMainTab);
    const globalProgressBar = document.getElementById("global-progress-bar");

    if (globalProgressBar && activeTab) {
        if (activeTab.isLoading) {
            finishedLoadingTabIds.delete("global-progress");
            globalProgressBar.style.transition = "none";
            globalProgressBar.style.width = "0%";
            globalProgressBar.style.opacity = "1";
            globalProgressBar.style.backgroundColor = "var(--theme-accent)";
            void globalProgressBar.offsetWidth;
            globalProgressBar.style.animation = "simulate-loading 5s cubic-bezier(0.1, 0.8, 0.2, 1) forwards";
        } 
        
        else {
            if (previousLoadingState.get("global-progress") === true) {
                // finished loading a page
                globalProgressBar.style.animation = "none";
                globalProgressBar.style.transition = "width 300ms ease-out, opacity 300ms ease-out 200ms";
                globalProgressBar.style.width = "100%";
                globalProgressBar.style.opacity = "0";
                finishedLoadingTabIds.add("global-progress");

                setTimeout(() => {
                    finishedLoadingTabIds.delete("global-progress");
                    const bar = document.getElementById("global-progress-bar");

                    if (bar) {
                        bar.style.transition = "none";
                        bar.style.width = "0%";
                        bar.style.opacity = "0";
                        bar.style.animation = "none";
                    }
                }, 600);
            } 
            
            else if (!finishedLoadingTabIds.has("global-progress")) {
                globalProgressBar.style.transition = "none";
                globalProgressBar.style.width = "0%";
                globalProgressBar.style.opacity = "0";
                globalProgressBar.style.animation = "none";
            }
        }
        previousLoadingState.set("global-progress", activeTab.isLoading);
    }
};


function createTabElement(tab, index, isInStack, tabs, level = 0) {
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


        tabE.className = `relative flex items-center px-2 cursor-pointer ${bgClass} flex-1 min-w-0 max-w-[10rem] mb-0 rounded-t-sm h-8 transition-all duration-100 gap-2 group-[.layout-left]:w-full group-[.layout-right]:w-full group-[.layout-left]:max-w-none group-[.layout-right]:max-w-none group-[.layout-left]:flex-none group-[.layout-right]:flex-none`;
        tabE.dataset.themeState = isSelected ? "selected" : tab.isMainTab ? "main" : tab.isActive ? "active" : "resting";

        tabE.title = `${tab.title || "Tab"}\nRAM: ${tabMemoryText(tab)}`;
        tabE.addEventListener("mouseenter", () => showTabHoverCard(tabE, tab));
        tabE.addEventListener("mouseleave", hideTabHoverCard);

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
                const rect = tabE.getBoundingClientRect();
                const x = e.clientX - rect.left;

                const targetParentPath = activeStackIds.slice(0, level);

                if (x > rect.width * 0.25 && x < rect.width * 0.75) {
                    if (tab.isStacked) {
                        const targetPath = tab.stackIds ? [...tab.stackIds] : [tab.stackId];
                        window.electronAPI.moveStack(dragStackId, targetPath);
                    }

                    else {
                        window.electronAPI.moveStackToTab(dragStackId, index, targetParentPath);
                    }
                }

                else {
                    window.electronAPI.moveStack(dragStackId, targetParentPath);
                    window.electronAPI.reorderStack(dragStackId, index);
                }
                return;
            }

            const startingIndex = parseInt(e.dataTransfer.getData("text/plain"));

            if (startingIndex !== index) {
              const rect = tabE.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              if (x > rect.width * 0.25 && x < rect.width * 0.75) {

                    if (tab.isStacked){
                        const targetPath = tab.stackIds ? [...tab.stackIds] : [tab.stackId];
                        const startingTab = tabs && tabs[startingIndex] ? tabs[startingIndex] : null;
                        const startingPath = startingTab ? (startingTab.stackIds ? [...startingTab.stackIds] : (startingTab.stackId ? [startingTab.stackId] : [])) : [];
                        const inSameStack = JSON.stringify(targetPath) === JSON.stringify(startingPath);

                        if (inSameStack) {
                            window.electronAPI.createStack([startingIndex, index], targetPath);
                        } else {
                            window.electronAPI.updateStack(targetPath, startingIndex);
                        }
                    }

                    else{
                        let currentPath = [];
                        if (isInStack && activeStackIds && activeStackIds.length > level) {
                            currentPath = activeStackIds.slice(0, level + 1);
                        }
                        window.electronAPI.createStack([startingIndex, index], currentPath);
                    }

                }
                else {
                    const startingTab = tabs && tabs[startingIndex] ? tabs[startingIndex] : null;

                    if (startingTab && startingTab.isStacked && (!tab.stackIds || JSON.stringify(startingTab.stackIds) !== JSON.stringify(tab.stackIds))) {
                        window.electronAPI.removeFromStack(startingIndex, level);
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

        tabE.setAttribute("data-tab-id", tab.id);

        const isSidebar = document.body.classList.contains('layout-left') || document.body.classList.contains('layout-right');
        if (isSidebar && level > 0) {
            const indent = level * 16;
            tabE.style.setProperty('margin-left', `${indent}px`, 'important');
            tabE.style.setProperty('width', `calc(100% - ${indent}px)`, 'important');
            tabE.style.setProperty('border-left', '2px solid var(--theme-border)', 'important');
            tabE.style.setProperty('border-top-left-radius', '0px', 'important');
            tabE.style.setProperty('border-bottom-left-radius', '0px', 'important');
        }

        return tabE;
}

export const rerenderCurrentTabs = () => {
    if (latestTabs) renderTabs(latestTabs);
};
