const LABELS = {
  newTab: "New Tab",
  newWindow: "New Window",
  closeTab: "Close Tab",
  reopenClosedTab: "Reopen Closed Tab",
  print: "Print",
  findInPage: "Find in Page",
  toggleDevTools: "Toggle Developer Tools",
  zoomIn: "Zoom In",
  zoomOut: "Zoom Out",
  resetZoom: "Reset Zoom",
  pip: "Picture in Picture",
  history: "History"
};

const DEFAULT_KEYBINDS = {
  newTab: "CmdOrCtrl+T",
  newWindow: "CmdOrCtrl+N",
  closeTab: "CmdOrCtrl+W",
  reopenClosedTab: "CmdOrCtrl+Shift+T",
  print: "CmdOrCtrl+P",
  toggleDevTools: "CmdOrCtrl+Shift+I",
  findInPage: "CmdOrCtrl+F",
  zoomIn: "CmdOrCtrl+=",
  zoomOut: "CmdOrCtrl+-",
  resetZoom: "CmdOrCtrl+0",
  pip: "Alt+P",
  history: "CmdOrCtrl+H"
};

function formatAccelerator(accelerator) {
  if (!accelerator) return "Not Set";
  return accelerator
    .replace(/CmdOrCtrl/g, "Ctrl/Cmd")
    .replace(/Control/g, "Ctrl")
    .replace(/Command/g, "Cmd")
    .replace(/\+/g, " + ");
}

export function setupKeybindControls() {
  const container = document.getElementById("keybinds-list");
  const resetAllBtn = document.getElementById("reset-all-keybinds-btn");
  const alertContainer = document.getElementById("keybind-conflict-alert");
  const alertMsg = document.getElementById("keybind-conflict-msg");
  const alertDismiss = document.getElementById("dismiss-keybind-alert");

  let currentKeybinds = { ...DEFAULT_KEYBINDS };
  let recordingAction = null;
  let keydownListener = null;

  function showAlert(msg) {
    if (alertContainer && alertMsg) {
      alertMsg.textContent = msg;
      alertContainer.classList.remove("hidden");
    }
  }

  function hideAlert() {
    if (alertContainer) {
      alertContainer.classList.add("hidden");
    }
  }

  if (alertDismiss) {
    alertDismiss.addEventListener("click", hideAlert);
  }

  function render() {
    if (!container) return;
    container.innerHTML = "";

    Object.keys(LABELS).forEach(actionKey => {
      const actionLabel = LABELS[actionKey];
      const accel = currentKeybinds[actionKey] || "";
      const defaultAccel = DEFAULT_KEYBINDS[actionKey];
      const isModified = accel !== defaultAccel;

      const row = document.createElement("div");
      row.className = "flex items-center justify-between gap-4 p-2 rounded input-theme border border-slate-700/30 hover:border-slate-600/50 transition-colors";

      const labelSpan = document.createElement("span");
      labelSpan.className = "font-semibold text-slate-200";
      labelSpan.textContent = actionLabel;

      const rightDiv = document.createElement("div");
      rightDiv.className = "flex items-center gap-2";

      if (isModified) {
        const resetSingleBtn = document.createElement("button");
        resetSingleBtn.className = "px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded transition-colors cursor-pointer";
        resetSingleBtn.textContent = "Reset";
        resetSingleBtn.title = `Reset to default (${formatAccelerator(defaultAccel)})`;
        resetSingleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          hideAlert();
          currentKeybinds[actionKey] = defaultAccel;
          saveKeybinds();
        });
        
        rightDiv.appendChild(resetSingleBtn);
      }

      const recordBtn = document.createElement("button");
      const isRecording = recordingAction === actionKey;

      if (isRecording) {
        recordBtn.className = "font-mono text-[11px] px-3 py-1.5 rounded bg-blue-600/80 text-white animate-pulse border border-blue-400 outline-none shadow-sm shadow-blue-500/30 cursor-pointer";
        recordBtn.textContent = "Press shortcut (Esc to cancel)...";
      }

      else {
        recordBtn.className = "font-mono text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer";
        recordBtn.textContent = formatAccelerator(accel);
      }

      recordBtn.addEventListener("click", () => {
        hideAlert();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording(actionKey);
        }
      });

      rightDiv.appendChild(recordBtn);
      row.appendChild(labelSpan);
      row.appendChild(rightDiv);
      container.appendChild(row);
    });
  }

  function startRecording(actionKey) {
    stopRecording();
    recordingAction = actionKey;
    render();

    keydownListener = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        stopRecording();
        return;
      }


      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push("CmdOrCtrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");

      let keyStr = e.key;
      if (keyStr === " ") keyStr = "Space";
      else if (keyStr === "+") keyStr = "=";
      else if (keyStr.length === 1) keyStr = keyStr.toUpperCase();

      parts.push(keyStr);
      const newAccel = parts.join("+");

      const existingAction = Object.keys(currentKeybinds).find(
        k => k !== actionKey && currentKeybinds[k] === newAccel
      );

      if (existingAction) {
        showAlert(`"${formatAccelerator(newAccel)}" is already assigned to ${LABELS[existingAction]}. Please choose a different shortcut.`);
        stopRecording();
        return;
      }

      currentKeybinds[actionKey] = newAccel;
      stopRecording();
      saveKeybinds();
    };

    window.addEventListener("keydown", keydownListener, true);
  }

  function stopRecording() {
    if (keydownListener) {
      window.removeEventListener("keydown", keydownListener, true);
      keydownListener = null;
    }
    
    recordingAction = null;
    render();
  }

  function saveKeybinds() {
    if (window.electronAPI && window.electronAPI.updateKeybinds) {
      window.electronAPI.updateKeybinds(currentKeybinds);
    }
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      hideAlert();
      stopRecording();
      currentKeybinds = { ...DEFAULT_KEYBINDS };
      if (window.electronAPI && window.electronAPI.resetKeybinds) {
        window.electronAPI.resetKeybinds();
      }
    });
  }

  render();

  return {
    updateSettings(settings) {
      if (settings && settings.keybinds) {
        currentKeybinds = { ...DEFAULT_KEYBINDS, ...settings.keybinds };
        render();
      }
    }
  };
}
