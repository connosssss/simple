



const addressBar = document.getElementById("address-bar");
let currentAddess = "";

export const updateAddressBar = (address) => {
    currentAddess = address;
    addressBar.value = shortenAddress(address);
}

export const setupSearchListeners = () => {
    addressBar.addEventListener("keydown", (event) => {
        if (event.key == "Enter") {
            event.preventDefault();
            currentAddess = addressBar.value;
            window.electronAPI.search(addressBar.value);
        }
    });

    addressBar.addEventListener("focus", () => {
        if (currentAddess) {
            addressBar.value = currentAddess;
            addressBar.select();
        }
    });

    addressBar.addEventListener("blur", () => {
        if (currentAddess) {
            addressBar.value = shortenAddress(currentAddess);
        }
    });

    // Toolbar Buttons
    document.getElementById("forward").addEventListener("click", () => window.electronAPI.toolbarAction("forward"));
    document.getElementById("back").addEventListener("click", () => window.electronAPI.toolbarAction("back"));
    document.getElementById("refresh").addEventListener("click", () => window.electronAPI.toolbarAction("refresh"));
}

const shortenAddress = (address) => {
    if(!address) return "";
    let index = address.indexOf("?");
    return index == -1 ? address : address.substring(0, index);
}