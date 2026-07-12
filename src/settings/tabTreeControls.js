const tabTreeContainer = document.getElementById("tab-tree-container");
const collapsedStacks = new Set();
let editingStackId = null;

export const setupTabTreeControls = () => {
    let currentTabs = [];
    let currentTree = null;

    const renderNode = (node, parentElement) => {
        if (node.type === 'stack') {
            const stackId = node.id;
            const stackName = node.value?.name || `Stack`;
            const children = node.children || [];
            
          let tabCount = 0;
          
            const countTabs = (n) => {
                if (n.type === 'tab') tabCount++;
                else if (n.children) n.children.forEach(countTabs);
            };
          
            children.forEach(countTabs);

            const isCollapsed = collapsedStacks.has(stackId);

            const stackContainer = document.createElement("div");
            stackContainer.className = "flex flex-col mb-1";

            const rowDiv = document.createElement("div");
            rowDiv.className = "flex items-center justify-between p-1.5 px-2.5 rounded-md hover:bg-slate-800/30 group select-none transition-all duration-150";

            const leftSide = document.createElement("div");
            leftSide.className = "flex items-center gap-2 min-w-0 flex-1";

            const toggle = document.createElement("span");
            toggle.className = "cursor-pointer flex items-center justify-center w-4 h-4 text-slate-400 hover:text-slate-200 transition-transform duration-155";
            toggle.innerHTML = isCollapsed 
                ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
                : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
            
            toggle.addEventListener("click", (e) => {
              e.stopPropagation();
              
                if (isCollapsed) {
                    collapsedStacks.delete(stackId);
                }
                else {
                    collapsedStacks.add(stackId);
                }
              
                updateTree(currentTabs, currentTree);
            });
            leftSide.appendChild(toggle);

            if (editingStackId === stackId) {
                const nameInput = document.createElement("input");
                nameInput.type = "text";
                nameInput.value = stackName;
                nameInput.className = "bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 outline-none text-xs w-40 font-semibold focus:ring-1 focus:ring-slate-600";
                
                const saveName = () => {
                    const val = nameInput.value.trim();
                    window.electronAPI.renameStack(stackId, val);
                    editingStackId = null;
                };

                nameInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        saveName();
                    } else if (e.key === "Escape") {
                        editingStackId = null;
                        updateTree(currentTabs, currentTree);
                    }
                });

                nameInput.addEventListener("blur", () => {
                    saveName();
                });

                leftSide.appendChild(nameInput);
                
                setTimeout(() => nameInput.focus(), 50);
            } else {
                const nameSpan = document.createElement("span");
                nameSpan.className = "font-semibold text-slate-200 truncate cursor-pointer hover:text-white transition-colors duration-100";
                nameSpan.textContent = stackName;
                nameSpan.addEventListener("click", () => {
                    if (isCollapsed) {
                        collapsedStacks.delete(stackId);
                    } else {
                        collapsedStacks.add(stackId);
                    }
                    updateTree(currentTabs, currentTree);
                });
                leftSide.appendChild(nameSpan);
            }

            const countSpan = document.createElement("span");
            countSpan.className = "text-[10px] px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/30 text-slate-400 font-medium ml-1.5 flex-shrink-0";
            countSpan.textContent = `${tabCount} tab${tabCount !== 1 ? 's' : ''}`;
            leftSide.appendChild(countSpan);

            rowDiv.appendChild(leftSide);

            const rightSide = document.createElement("div");
            rightSide.className = "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 ml-2";

            const renameBtn = document.createElement("button");
            renameBtn.className = "p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-all duration-100 cursor-pointer";
            renameBtn.title = "Rename Stack";
            renameBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`;
            renameBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                editingStackId = stackId;
                updateTree(currentTabs, currentTree);
            });
            rightSide.appendChild(renameBtn);

            const hasActiveTabs = children.some(function checkActive(n) {
                if (n.type === 'tab') {
                    const matchingTab = currentTabs.find(t => t.id === n.value?.id);
                    return matchingTab && matchingTab.isActive;
                }
                return n.children && n.children.some(checkActive);
            });

            if (hasActiveTabs) {
                const hibernateBtn = document.createElement("button");
                hibernateBtn.className = "p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 rounded transition-all duration-100 cursor-pointer";
                hibernateBtn.title = "Hibernate Stack";
                hibernateBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
                hibernateBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    window.electronAPI.hibernateStack(stackId);
                });
                rightSide.appendChild(hibernateBtn);
            }

            const closeBtn = document.createElement("button");
            closeBtn.className = "p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-all duration-100 cursor-pointer";
            closeBtn.title = "Close Stack";
            closeBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
            closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                window.electronAPI.closeStack(stackId);
            });
          
            rightSide.appendChild(closeBtn);

            rowDiv.appendChild(rightSide);
            stackContainer.appendChild(rowDiv);

            if (!isCollapsed && children.length > 0) {
                const childrenDiv = document.createElement("div");
                childrenDiv.className = "pl-4 ml-4.5 my-1 space-y-1";
                children.forEach(child => renderNode(child, childrenDiv));
                stackContainer.appendChild(childrenDiv);
            }

            parentElement.appendChild(stackContainer);

        } else if (node.type === 'tab') {
            const tabId = node.value?.id;
            const tabTitle = node.value?.title || "New Tab";
            const tabAddress = node.value?.address || "about:blank";

            const tabIndex = currentTabs.findIndex(t => t.id === tabId);
            const tabData = tabIndex !== -1 ? currentTabs[tabIndex] : null;
            const isMainTab = tabData ? tabData.isMainTab : false;
            const isActive = tabData ? tabData.isActive : true;
            const memoryText = tabData?.memoryText || "0 MB";

            const rowDiv = document.createElement("div");
            rowDiv.className = `flex items-center justify-between p-1.5 px-2.5 rounded-md hover:bg-slate-800/30 group select-none cursor-pointer transition-all duration-150 ${
                isMainTab ? 'bg-slate-800/40 text-slate-100 font-semibold' : ''
            }`;

            rowDiv.addEventListener("click", () => {
                if (tabIndex !== -1) {
                    window.electronAPI.switchTab(tabIndex);
                }
            });

            const leftSide = document.createElement("div");
            leftSide.className = "flex items-center gap-2 min-w-0 flex-1";

            const icon = document.createElement("img");
            icon.className = "w-3.5 h-3.5 flex-shrink-0 rounded-sm";
          let domain = "";
          
            try {
                domain = new URL(tabAddress).hostname;
            }

            catch (e) {
                domain = "";
            }
            icon.src = tabData?.iconURL || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : "");
            
            icon.onerror = () => {
                const fallbackSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                fallbackSvg.setAttribute("viewBox", "0 0 24 24");
                fallbackSvg.setAttribute("fill", "none");
                fallbackSvg.setAttribute("stroke", "currentColor");
                fallbackSvg.setAttribute("stroke-width", "1.5");
                fallbackSvg.setAttribute("class", "w-3.5 h-3.5 text-slate-500 flex-shrink-0");
                fallbackSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />`;
                icon.replaceWith(fallbackSvg);
            };
            leftSide.appendChild(icon);

            const titleSpan = document.createElement("span");
            titleSpan.className = `font-medium truncate max-w-[220px] ${isMainTab ? 'text-white' : 'text-slate-300'}`;
            titleSpan.textContent = tabTitle;
            leftSide.appendChild(titleSpan);

            const memoryBadge = document.createElement("span");
            memoryBadge.className = "text-[10px] px-1.5 py-0.5 rounded bg-slate-800/40 text-slate-400 font-medium flex-shrink-0";
            memoryBadge.textContent = memoryText;
            leftSide.appendChild(memoryBadge);

            const addressSpan = document.createElement("span");
            addressSpan.className = "text-[10px] text-slate-500 font-mono truncate min-w-0 flex-1 ml-1.5";
            addressSpan.textContent = tabAddress;
            addressSpan.title = tabAddress;
            leftSide.appendChild(addressSpan);

            if (isMainTab) {
                const activeBadge = document.createElement("span");
                activeBadge.className = "px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-400 ml-1.5 flex-shrink-0";
                activeBadge.textContent = "Active";
                leftSide.appendChild(activeBadge);
            }
            else if (!isActive) {
                const hibernatedBadge = document.createElement("span");
                hibernatedBadge.className = "px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800/35 text-slate-500 ml-1.5 flex-shrink-0";
                hibernatedBadge.textContent = "Hibernated";
                leftSide.appendChild(hibernatedBadge);
            }

            rowDiv.appendChild(leftSide);

            const rightSide = document.createElement("div");
            rightSide.className = "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 ml-2";

            if (isActive && !isMainTab && tabIndex !== -1) {
                const hibernateBtn = document.createElement("button");
                hibernateBtn.className = "p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 rounded transition-all duration-100 cursor-pointer";
                hibernateBtn.title = "Hibernate Tab";
                hibernateBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;

              hibernateBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    window.electronAPI.hibernateTab(tabIndex);
                });
                rightSide.appendChild(hibernateBtn);
            }

            if (tabIndex !== -1) {
                const closeBtn = document.createElement("button");
                closeBtn.className = "p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-all duration-100 cursor-pointer";
                closeBtn.title = "Close Tab";
              closeBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
              
                closeBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    window.electronAPI.closeTab(tabIndex);
                });
                rightSide.appendChild(closeBtn);
            }

            rowDiv.appendChild(rightSide);
            parentElement.appendChild(rowDiv);
        }
    };

    const updateTree = (tabs, tabTree) => {
        currentTabs = tabs;
        currentTree = tabTree;

        if (!tabTreeContainer) return;

        tabTreeContainer.innerHTML = "";

        const findTabsRoot = (node) => {
            if (!node) return null;
            if (node.type === 'tabs') return node;
            if (node.children) {
                for (const child of node.children) {
                    const match = findTabsRoot(child);
                    if (match) return match;
                }
            }
            return null;
        };

        const tabsRoot = findTabsRoot(tabTree);
        
        if (!tabsRoot || !tabsRoot.children || tabsRoot.children.length === 0) {
            tabTreeContainer.innerHTML = `<div class="text-slate-500 text-xs py-8 text-center font-medium">No tabs or stacks open</div>`;
            return;
        }

        tabsRoot.children.forEach(child => {
            renderNode(child, tabTreeContainer);
        });
    };

    return {
        update(tabs, tabTree) {
            updateTree(tabs, tabTree);
        }
    };
};
