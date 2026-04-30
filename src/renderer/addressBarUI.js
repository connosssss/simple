const addressBar = document.getElementById("address-bar");
let currentAddress = "";

export const updateAddressBar = (address) => {
  currentAddress = address;
  addressBar.value = shortenAddress(address);
};

export const setupAddressBarUI = () => {
  addressBar.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      currentAddress = addressBar.value;
      window.electronAPI.search(addressBar.value);
    }
  });

  addressBar.addEventListener("focus", () => {
    if (currentAddress) {
      addressBar.value = currentAddress;
      addressBar.select();
    }
  });

  addressBar.addEventListener("blur", () => {
    if (currentAddress) {
      addressBar.value = shortenAddress(currentAddress);
    }
  });

  document.getElementById("forward").addEventListener("click", () => {
    window.electronAPI.toolbarAction("forward");
  });

  document.getElementById("back").addEventListener("click", () => {
    window.electronAPI.toolbarAction("back");
  });

  document.getElementById("refresh").addEventListener("click", () => {
    window.electronAPI.toolbarAction("refresh");
  });
};

const shortenAddress = (address) => {
  if (!address) return "";

  const queryIndex = address.indexOf("?");
  return queryIndex === -1 ? address : address.substring(0, queryIndex);
};