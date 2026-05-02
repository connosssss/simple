const urlInput = document.getElementById("extension-url-input");
const installBtn = document.getElementById("extension-install-btn");
const statusEl = document.getElementById("extension-status");
const extensionsList = document.getElementById("extensions-list");

const showStatus = (message, type = "info") => {
  statusEl.classList.remove("hidden", "text-green-400", "text-red-400", "text-slate-400");
  
  if (type === "success") {
    statusEl.classList.add("text-green-400");
  }

  else if (type === "error") {
    statusEl.classList.add("text-red-400");
  }

  else {
    statusEl.classList.add("text-slate-400");
  }

  statusEl.textContent = message;
};

const hideStatus = () => {
  statusEl.classList.add("hidden");
  statusEl.textContent = "";
};

const renderExtensions = (extensions) => {
  extensionsList.innerHTML = "";

  if (!extensions || extensions.length === 0) {
    extensionsList.innerHTML = '<div class="text-slate-500 text-sm">No extensions installed.</div>';
    return;
  }

  extensions.forEach((ext) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between bg-slate-900 px-3 py-2 rounded-sm";

    const info = document.createElement("div");
    info.className = "flex flex-col gap-0.5 min-w-0 flex-1";

    const name = document.createElement("div");
    name.className = "text-slate-100 text-sm font-medium truncate";
    name.textContent = ext.name;
    name.title = ext.name;

    const meta = document.createElement("div");
    meta.className = "flex items-center gap-2";

    const idLabel = document.createElement("span");
    idLabel.className = "text-slate-500 text-xs font-mono truncate max-w-[240px]";
    idLabel.textContent = ext.id;
    idLabel.title = ext.id;

    const statusBadge = document.createElement("span");
    statusBadge.className = ext.loaded ? "text-xs bg-green-900/40 rounded-sm" : "text-xs bg-red-900/40 rounded-sm";
    statusBadge.textContent = ext.loaded ? "Active" : "Failed";

    meta.appendChild(idLabel);
    meta.appendChild(statusBadge);
    info.appendChild(name);
    info.appendChild(meta);

    const removeBtn = document.createElement("button");
    removeBtn.className = "text-red-400/70 text-xs px-2 py-1 rounded transition-all duration-100 hover:text-red-300 hover:bg-red-900/30 flex-shrink-0 ml-2";
    removeBtn.textContent = "Remove";

    
    removeBtn.addEventListener("click", async () => {
      removeBtn.disabled = true;
      removeBtn.textContent = "Removing...";

      const result = await window.electronAPI.removeExtension(ext.id);
      
      if (result.success) {
        await loadExtensions();
        showStatus(`Removed "${ext.name}"`, "success");
      }

      else {
        showStatus(`Failed to remove: ${result.error}`, "error");
        removeBtn.disabled = false;
        removeBtn.textContent = "Remove";
      }
    });

    row.appendChild(info);
    row.appendChild(removeBtn);
    extensionsList.appendChild(row);
  });
};

const loadExtensions = async () => {
  try {
    const extensions = await window.electronAPI.getExtensions();
    renderExtensions(extensions);
  }

  catch (e) {
    extensionsList.innerHTML = '<div class="text-red-400 text-sm">Failed to load extensions.</div>';
  }
};

export const setupExtensionControls = () => {
  loadExtensions();

  installBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    
    if (!url) {
      showStatus("Please paste a Chrome Web Store URL.", "error");
      return;
    }

    installBtn.disabled = true;
    installBtn.textContent = "Installing...";

    
    showStatus("Downloading and installing extension...", "info");

    try {
      const result = await window.electronAPI.installExtension(url);

      if (result.success) {
        let msg = `Installed "${result.extension.name}" successfully!`;
        
        if (result.extension.warning) {
          msg += `\n${result.extension.warning}`;
          showStatus(msg, "error");
        }
       
        else {
          msg += " Restart tabs to activate.";
          showStatus(msg, "success");
        }
        
        urlInput.value = "";
        await loadExtensions();
      }

      else {
        showStatus(result.error, "error");
      }
    }


    catch (e) {
      showStatus(`Unexpected error: ${e.message}`, "error");
    }

    installBtn.disabled = false;
    installBtn.textContent = "Install";
  });

  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      installBtn.click();
    }
  });
};
