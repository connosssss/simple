const { app, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DOWNLOADS_FILE = path.join(app.getPath('userData'), 'downloads.json');
let downloads = [];
const activeDownloads = new Map();
let broadcastCallback = null;


const loadHistory = () => {
  try {

    if (fs.existsSync(DOWNLOADS_FILE)) {
      const data = fs.readFileSync(DOWNLOADS_FILE, 'utf-8');
      downloads = JSON.parse(data);
      downloads.forEach(dl => {
        if (dl.state === 'progressing' || dl.state === 'paused') {
          dl.state = 'interrupted';
          dl.speed = 0;
        }
      });
    }
  }
   catch (e) {
    console.error('Failed to load downloads history:', e);
    downloads = [];
  }
};


const saveHistory = () => {
  try {
    
    const cleanDownloads = downloads.slice(0, 50).map(dl => ({
      id: dl.id,
      filename: dl.filename,
      savePath: dl.savePath,
      totalBytes: dl.totalBytes,
      receivedBytes: dl.receivedBytes,
      state: dl.state,
      isPaused: dl.isPaused,
      startTime: dl.startTime,
      endTime: dl.endTime,
      speed: 0 
      
    }));

    fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(cleanDownloads, null, 2), 'utf-8');
  } 
  
  catch (e) {
    console.error('Failed to save downloads history:', e);
  }
};

const setBroadcastCallback = (cb) => {
  broadcastCallback = cb;
};

const broadcastUpdate = (type, data) => {
  if (broadcastCallback) {
    broadcastCallback(type, data);
  }
};

const registerDownload = (id, item) => {
  activeDownloads.set(id, item);

  const filename = item.getFilename();
  const totalBytes = item.getTotalBytes();
  const startTime = Date.now();

  const dlRecord = {
    id,
    filename,
    savePath: item.getSavePath() || '',
    totalBytes,
    receivedBytes: item.getReceivedBytes(),
    state: 'progressing',
    isPaused: item.isPaused(),
    startTime,
    endTime: null,
    speed: 0
  };

  downloads.unshift(dlRecord);
  saveHistory();
  broadcastUpdate('download-started', dlRecord);

  let lastReceivedBytes = 0;
  let lastUpdateTime = Date.now();

  item.on('updated', (event, state) => {

    dlRecord.savePath = item.getSavePath() || dlRecord.savePath;
    if (dlRecord.savePath) {
      dlRecord.filename = path.basename(dlRecord.savePath);
    }

    dlRecord.receivedBytes = item.getReceivedBytes();
    dlRecord.totalBytes = item.getTotalBytes();
    dlRecord.isPaused = item.isPaused();

    if (state === 'progressing') {
      dlRecord.state = dlRecord.isPaused ? 'paused' : 'progressing';


      const now = Date.now();
      const timeDelta = (now - lastUpdateTime) / 1000;

      if (timeDelta >= 0.5) {
        const bytesDelta = dlRecord.receivedBytes - lastReceivedBytes;
        dlRecord.speed = Math.max(0, Math.round(bytesDelta / timeDelta));
        lastReceivedBytes = dlRecord.receivedBytes;
        lastUpdateTime = now;
      }

    } 
    else if (state === 'interrupted') {
      dlRecord.state = 'interrupted';
      dlRecord.speed = 0;
    }

    broadcastUpdate('download-updated', dlRecord);
  });

  item.once('done', (event, state) => {
    dlRecord.savePath = item.getSavePath() || dlRecord.savePath;
    if (dlRecord.savePath) {
      dlRecord.filename = path.basename(dlRecord.savePath);
    }
    
    dlRecord.receivedBytes = item.getReceivedBytes();
    dlRecord.state = state; // 'completed', 'cancelled', or 'interrupted'
    dlRecord.isPaused = false;
    dlRecord.endTime = Date.now();
    dlRecord.speed = 0;

    activeDownloads.delete(id);
    saveHistory();
    broadcastUpdate('download-done', dlRecord);
  });
};

const getDownloads = () => downloads;

const pauseDownload = (id) => {
  const item = activeDownloads.get(id);
  if (item && !item.isPaused()) {
    item.pause();
  }
};

const resumeDownload = (id) => {
  const item = activeDownloads.get(id);
  if (item && item.canResume()) {
    item.resume();
  }
};

const cancelDownload = (id) => {
  const item = activeDownloads.get(id);
  if (item) {
    item.cancel();
  } else {


    const dl = downloads.find(d => d.id === id);

    if (dl && (dl.state === 'progressing' || dl.state === 'paused')) {
      dl.state = 'cancelled';
      dl.speed = 0;
      saveHistory();
      broadcastUpdate('download-updated', dl);
    }
  }
};

const removeDownload = (id) => {
  cancelDownload(id);
  downloads = downloads.filter(dl => dl.id !== id);
  saveHistory();


  broadcastUpdate('download-removed', { id });
};

const showInFolder = (id) => {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl.savePath && fs.existsSync(dl.savePath)) {
    shell.showItemInFolder(dl.savePath);
  }
};

const openFile = (id) => {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl.savePath && fs.existsSync(dl.savePath)) {
    shell.openPath(dl.savePath);
  }
};



loadHistory();

module.exports = {
  registerDownload,
  getDownloads,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  removeDownload,
  showInFolder,
  openFile,
  setBroadcastCallback
};
