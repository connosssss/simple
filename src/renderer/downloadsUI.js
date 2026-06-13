let localDownloads = [];


const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  return `(${formatBytes(bytesPerSec)}/s)`;
};


const formatTimeRemaining = (received, total, speed) => {
  if (!speed || speed <= 0 || !total || total <= 0) return '';
  const remainingBytes = total - received;
  if (remainingBytes <= 0) return '';
  
  const seconds = Math.round(remainingBytes / speed);
  if (seconds < 60) return `— ${seconds}s remaining`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `— ${minutes}m ${remainingSec}s remaining`;
};


const updateToolbarStatus = () => {
  const downloadsBtn = document.getElementById('downloads-btn');
  const progressRing = document.getElementById('downloads-progress-ring');
  const progressCircle = document.getElementById('downloads-progress-bar-circle');
  const countBadge = document.getElementById('downloads-count-badge');
  const icon = document.getElementById('downloads-icon');

  if (!downloadsBtn) return;

  const activeDownloads = localDownloads.filter(dl => dl.state === 'progressing' || dl.state === 'paused');
  
  if (activeDownloads.length > 0) {
    countBadge.textContent = activeDownloads.length;
    countBadge.classList.remove('hidden');
    icon.style.color = 'var(--theme-accent)';
  } 
  else {
    countBadge.classList.add('hidden');
    icon.style.color = '';
  }

  const activeWithProgress = activeDownloads.filter(dl => dl.totalBytes > 0);
  if (activeWithProgress.length > 0) {
    const totalReceived = activeWithProgress.reduce((sum, dl) => sum + dl.receivedBytes, 0);
    const totalBytes = activeWithProgress.reduce((sum, dl) => sum + dl.totalBytes, 0);
    const progress = totalBytes > 0 ? (totalReceived / totalBytes) : 0;
    
    const offset = 75.4 - (progress * 75.4);
    progressCircle.style.strokeDashoffset = offset;
    progressRing.classList.remove('hidden');
  } 
  
  else {
    progressRing.classList.add('hidden');
  }
};

const toggleDownloadsDropdown = (forceClose = false) => {

  const dropdown = document.getElementById('downloads-dropdown');
  const btn = document.getElementById('downloads-btn');
  if (!dropdown) return;

  const isHidden = dropdown.classList.contains('hidden');
  const shouldShow = !forceClose && isHidden;

  if (shouldShow) {
    dropdown.classList.remove('hidden');
    btn.classList.add('bg-white/10', 'text-white');
    window.electronAPI.setDownloadsDropdownVisible(true);
    renderDownloadsList();
  } 
  
  else {
    dropdown.classList.add('hidden');
    btn.classList.remove('bg-white/10', 'text-white');
    window.electronAPI.setDownloadsDropdownVisible(false);
  }
};

const renderDownloadsList = () => {
  const listContainer = document.getElementById('downloads-list-container');
  if (!listContainer) return;

  if (localDownloads.length === 0) {
    listContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-center text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" class="w-8 h-8 mb-2 opacity-50">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span class="text-xs">No downloads yet</span>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = '';
  localDownloads.forEach(dl => {
    const isDownloading = dl.state === 'progressing';
    const isPaused = dl.state === 'paused';
    const isCompleted = dl.state === 'completed';
    const isCancelled = dl.state === 'cancelled';
    const isInterrupted = dl.state === 'interrupted';

    const percent = dl.totalBytes > 0 ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'flex flex-col gap-1 py-2 px-2.5 border-b border-[var(--theme-border)] last:border-b-0 hover:bg-[var(--theme-accent-soft)] relative rounded-none';

    let statusText = '';
    if (isDownloading) {
      statusText = `${formatBytes(dl.receivedBytes)} of ${formatBytes(dl.totalBytes)} ${formatSpeed(dl.speed)} ${formatTimeRemaining(dl.receivedBytes, dl.totalBytes, dl.speed)}`;
    } 
    
    else if (isPaused) {
      statusText = `Paused — ${formatBytes(dl.receivedBytes)} of ${formatBytes(dl.totalBytes)}`;
    } 
    
    else if (isCompleted) {
      statusText = `Completed — ${formatBytes(dl.totalBytes)}`;
    } 
    
    else if (isCancelled) {
      statusText = 'Cancelled';
    } 
    
    else if (isInterrupted) {
      statusText = 'Failed/Interrupted';
    }


    const headerRow = document.createElement('div');
    headerRow.className = 'flex justify-between items-start w-full pr-7';
    
    const title = document.createElement('span');
    title.className = `text-xs font-semibold truncate select-all flex-grow cursor-pointer text-[var(--theme-text)] ${isCompleted ? 'hover:underline' : 'opacity-70'}`;
    title.textContent = dl.filename;
    title.title = dl.filename;

    if (isCompleted) {
      title.style.color = 'var(--theme-accent)';
      title.addEventListener('click', () => {
        window.electronAPI.openDownloadedFile(dl.id);
      });
    }

    headerRow.appendChild(title);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-1.5 right-1.5 p-0.5 text-[var(--theme-text)] opacity-60 hover:opacity-100 rounded-none hover:bg-[var(--theme-accent-soft)]';
    removeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" class="w-3.5 h-3.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>

    `;

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.electronAPI.removeDownload(dl.id);
    });
    card.appendChild(removeBtn);
    card.appendChild(headerRow);


    const infoLine = document.createElement('div');
    infoLine.className = 'text-[10px] text-[var(--theme-text)] opacity-60 font-medium tracking-wide';
    
    const infoText = document.createElement('span');
    infoText.textContent = statusText;
    infoLine.appendChild(infoText);
    card.appendChild(infoLine);


    if (isDownloading || isPaused) {
      const progressContainer = document.createElement('div');
      progressContainer.className = 'w-full h-1.5 bg-[var(--theme-resting)] rounded-none overflow-hidden mt-0.5';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'h-full rounded-none';
      progressBar.style.width = `${percent}%`;
      progressBar.style.backgroundColor = isPaused ? 'var(--theme-accent-soft)' : 'var(--theme-accent)';
      
      progressContainer.appendChild(progressBar);
      card.appendChild(progressContainer);
    }

    const actionsRow = document.createElement('div');
    actionsRow.className = 'flex gap-2.5 items-center mt-1.5 justify-end';

    if (isDownloading) {
      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-text)] rounded-none hover:bg-[var(--theme-accent-soft)] whitespace-nowrap';
      pauseBtn.textContent = 'Pause';
      pauseBtn.addEventListener('click', () => window.electronAPI.pauseDownload(dl.id));
      actionsRow.appendChild(pauseBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 rounded-none hover:bg-rose-400/10 whitespace-nowrap';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => window.electronAPI.cancelDownload(dl.id));
      actionsRow.appendChild(cancelBtn);
    } 
    
    else if (isPaused) {
      const resumeBtn = document.createElement('button');
      resumeBtn.className = 'px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-text)] rounded-none hover:bg-[var(--theme-accent-soft)] whitespace-nowrap';
      resumeBtn.textContent = 'Resume';
      resumeBtn.addEventListener('click', () => window.electronAPI.resumeDownload(dl.id));
      actionsRow.appendChild(resumeBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 rounded-none hover:bg-rose-400/10 whitespace-nowrap';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => window.electronAPI.cancelDownload(dl.id));
      actionsRow.appendChild(cancelBtn);
    } 
    
    else if (isCompleted) {
      const folderBtn = document.createElement('button');

      folderBtn.className = 'px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-text)] rounded-none hover:bg-[var(--theme-accent-soft)] whitespace-nowrap';
      folderBtn.textContent = 'Show in folder';
      folderBtn.addEventListener('click', () => window.electronAPI.showInFolder(dl.id));
      actionsRow.appendChild(folderBtn);
    }

    if (actionsRow.children.length > 0) {
      card.appendChild(actionsRow);
    }

    listContainer.appendChild(card);
  });
};

export const setupDownloadsUI = async () => {
  const downloadsBtn = document.getElementById('downloads-btn');
  const clearBtn = document.getElementById('clear-downloads-btn');

  if (!downloadsBtn) return;

  downloadsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDownloadsDropdown();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localDownloads.forEach(dl => {
        if (dl.state === 'completed' || dl.state === 'cancelled' || dl.state === 'interrupted') {
          window.electronAPI.removeDownload(dl.id);
        }
      });
    });
  }

  try {
    localDownloads = await window.electronAPI.getDownloads();
    updateToolbarStatus();
  } 
  
  catch (err) {
    console.error('Failed to get initial downloads:', err);
  }

  document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('downloads-dropdown');
    const btn = document.getElementById('downloads-btn');

    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!dropdown.contains(event.target) && !btn.contains(event.target)) {
        toggleDownloadsDropdown(true);
      }
    }
  });

  window.electronAPI.onDownloadStarted((dl) => {
    const existingIdx = localDownloads.findIndex(d => d.id === dl.id);
    if (existingIdx > -1) {
      localDownloads[existingIdx] = dl;
    } else {
      localDownloads.unshift(dl);
    }

    updateToolbarStatus();
    renderDownloadsList();
  });

  window.electronAPI.onDownloadUpdated((dl) => {
    const existingIdx = localDownloads.findIndex(d => d.id === dl.id);
    if (existingIdx > -1) {
      localDownloads[existingIdx] = dl;
    } 
    else {
      localDownloads.unshift(dl);
    }

    updateToolbarStatus();
    renderDownloadsList();
  });

  window.electronAPI.onDownloadDone((dl) => {
    const existingIdx = localDownloads.findIndex(d => d.id === dl.id);
    if (existingIdx > -1) {
      localDownloads[existingIdx] = dl;
    } 
    else {
      localDownloads.unshift(dl);
    }

    updateToolbarStatus();
    renderDownloadsList();
  });

  window.electronAPI.onDownloadRemoved(({ id }) => {
    localDownloads = localDownloads.filter(d => d.id !== id);
    updateToolbarStatus();
    renderDownloadsList();
  });
};
