



document.getElementById("new-tab").onclick = () => {
    window.electronAPI.createTab()
}





const tabsList = document.getElementById("tabs-list");
const addressBar = document.getElementById("address-bar")
let currentAddess = ""

window.electronAPI.onUpdateTabs((tabs) => {
    renderTabs(tabs);
});

// RENDER TABS + ADDRESS BAR
const renderTabs = (tabs) => {
    tabsList.innerHTML = "";



    tabs.forEach((tab, index) => {
        const tabE = document.createElement("div");
        tabE.className = `flex items-center px-4 cursor-pointer text-white ${tab.isMainTab ? `bg-slate-700 hover:bg-slate-600` : tab.isActive ? `bg-slate-800 hover:bg-slate-700` : `bg-slate-800/50 hover:bg-slate-700/50 text-slate-600`} 
         flex-1 min-w-0
        mb-0 rounded-t-sm h-[29px] transition-all duration-100`;
        tabE.title = tab.title || "Tab"

        const titleSpan = document.createElement("span");
        titleSpan.className = "truncate flex-1 overflow-hidden pointer-events-none text-sm";
        titleSpan.textContent = tab.title || "New Tab";
        tabE.appendChild(titleSpan);

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
            console.log(`Closing tab ${index}`);
            e.stopPropagation();
            window.electronAPI.closeTab(index);
        }

        tabE.appendChild(closeB);

        tabE.onclick = () => {
            window.electronAPI.switchTab(index);
        }

        tabsList.appendChild(tabE)




        if (tab.isMainTab){
            currentAddess = tab.address
            //might be doing it 2x but it works ? 
            addressBar.value = shortenAddress(tab.address);
        }
    })
}




addressBar.addEventListener("keydown", (event) => {
    if (event.key == "Enter"){
        event.preventDefault();
        currentAddess = addressBar.value;
        window.electronAPI.search(addressBar.value)
    }
})

addressBar.addEventListener("focus", () => {
    if(currentAddess) {
        addressBar.value = currentAddess;
        
        addressBar.select();
    }
});

addressBar.addEventListener("blur", () => {
    if(currentAddess) {
        addressBar.value = shortenAddress(currentAddess);
    }
})

const shortenAddress = (address) => {

    let index = address.indexOf("?");

    console.log("index: " + index + "address: " + address)

    return index == -1 ? address: address.substring(0,index);

}


const fButton = document.getElementById("forward")
const bButton = document.getElementById("back")
const rButton = document.getElementById("refresh")

fButton.addEventListener("click", () => {
    
    window.electronAPI.toolbarAction("forward")
})

bButton.addEventListener("click", () => {

    window.electronAPI.toolbarAction("back")
})

rButton.addEventListener("click", () => {

    window.electronAPI.toolbarAction("refresh")
})

