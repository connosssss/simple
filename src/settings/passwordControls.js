const offerToSaveCheckbox = document.getElementById("offer-to-save-passwords");
const passwordsList = document.getElementById("passwords-settings-list");
const passwordsCount = document.getElementById("passwords-list-count");
const passwordSearchInput = document.getElementById("password-search");

export const setupPasswordControls = () => {
  let allPasswords = [];
  let filterText = "";

  const loadPasswords = async () => {
    
    try {
      allPasswords = await window.electronAPI.getAllPasswords();
      const settings = await window.electronAPI.getPasswordSettings();
      
      if (offerToSaveCheckbox) {
        offerToSaveCheckbox.checked = settings.offerToSave;
      }
      
      renderPasswords();
    }
    
    catch (e) {
      console.error("Failed to load passwords:", e);
      
      if (passwordsList) {
        passwordsList.innerHTML = '<div class="text-red-400">Failed to load passwords.</div>';
      }
    }
  };

  const getFilteredPasswords = () => {
    if (!filterText) return allPasswords;
    const query = filterText.toLowerCase();
    
    return allPasswords.filter(p => 
      (p.origin && p.origin.toLowerCase().includes(query)) || 
      (p.username && p.username.toLowerCase().includes(query))
    );
    
  };

  const renderPasswords = () => {
    if (!passwordsList) return;
    
    const filtered = getFilteredPasswords();
    if (passwordsCount) {
      passwordsCount.textContent = `${filtered.length} of ${allPasswords.length} saved password${allPasswords.length !== 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
      passwordsList.innerHTML = '<div class="text-slate-500 text-xs py-2">No passwords match.</div>';
      return;
    }
    passwordsList.innerHTML = "";

    filtered.forEach(cred => {
      const container = document.createElement("div");
      container.className = "flex items-center justify-between border-b border-slate-700/30 py-2.5 last:border-b-0 gap-4";

      const info = document.createElement("div");
      info.className = "flex flex-col gap-0.5 min-w-0";

      let displayDomain = cred.origin;
      
      try {
        displayDomain = new URL(cred.origin).hostname;
      }
      catch (e) { }

      
      const originSpan = document.createElement("span");
      originSpan.className = "text-slate-200 font-semibold truncate text-[13px]";
      originSpan.textContent = displayDomain;
      originSpan.title = cred.origin;

      const userSpan = document.createElement("span");
      userSpan.className = "text-slate-400 truncate text-[11px]";
      userSpan.textContent = cred.username || "(no username)";

      info.appendChild(originSpan);
      info.appendChild(userSpan);

      const actions = document.createElement("div");
      actions.className = "flex items-center gap-2 flex-shrink-0";

      const passwordContainer = document.createElement("div");
      passwordContainer.className = "flex items-center gap-1.5 bg-black/25 px-2 py-1 rounded border border-slate-700/40 text-[11px]";
      
      const pwdText = document.createElement("span");
      pwdText.textContent = "••••••••";
      pwdText.className = "w-16 text-center tracking-widest text-slate-400 select-none";

      const showBtn = document.createElement("button");
      showBtn.className = "text-slate-400 hover:text-slate-200 text-[10px] font-medium transition-colors ml-1 px-1";
      showBtn.textContent = "Show";

      
      let revealed = false;
      showBtn.addEventListener("click", () => {
        revealed = !revealed;
        if (revealed) {
          pwdText.textContent = cred.password;
          pwdText.className = "w-auto text-left tracking-normal text-slate-300 select-text px-1";
          showBtn.textContent = "Hide";
        }

        else {
          pwdText.textContent = "••••••••";
          pwdText.className = "w-16 text-center tracking-widest text-slate-400 select-none";
          showBtn.textContent = "Show";
        }
      });

      const copyBtn = document.createElement("button");
      copyBtn.className = "text-slate-400 hover:text-slate-200 text-[10px] font-medium transition-colors px-1";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(cred.password);
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
      });

      passwordContainer.appendChild(pwdText);
      passwordContainer.appendChild(showBtn);
      passwordContainer.appendChild(copyBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "text-red-400/80 text-xs px-2 py-1 rounded ml-1";
      deleteBtn.textContent = "x";
      
      deleteBtn.addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete the password for ${displayDomain}?`)) {
          const success = await window.electronAPI.deletePassword(cred.id);
          
          if (success) {
            loadPasswords();
          }
        }
      });

      actions.appendChild(passwordContainer);
      actions.appendChild(deleteBtn);

      container.appendChild(info);
      container.appendChild(actions);

      passwordsList.appendChild(container);
    });
  };

  if (passwordSearchInput) {
    passwordSearchInput.addEventListener("input", (e) => {
      filterText = e.target.value;
      renderPasswords();
    });
  }

  if (offerToSaveCheckbox) {
    offerToSaveCheckbox.addEventListener("change", async (e) => {
      await window.electronAPI.setOfferToSavePasswords(e.target.checked);
    });
  }

  loadPasswords();

  return {
    refresh: loadPasswords
  };
};
