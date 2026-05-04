const { session, app } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');

const EXTENSIONS_DIR = path.join(app.getPath('userData'), 'extensions');
const EXTENSIONS_META_PATH = path.join(app.getPath('userData'), 'extensions.json');
const PARTITION = 'persist:main';

const CRX_DOWNLOAD_URL = (id) => `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=130.0&x=id%3D${id}%26installsource%3Dondemand%26uc`;


const parseExtensionId = (url) => {
  const trimmed = url.trim();

  if (/^[a-p]{32}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname.split('/').filter(Boolean);

    for (const seg of segments) {
      if (/^[a-p]{32}$/.test(seg)) {
        return seg;
      }
    }
  }

  catch {}

  return null;
};

const downloadFile = (url, maxRedirects = 5) => {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error('Too many redirects'));
      return;
    }

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'application/x-chrome-extension,*/*',
      }
    };

    https.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
    
  });
};


const extractZipFromCrx = (buffer) => {
  const magic = buffer.toString('ascii', 0, 4);
  if (magic !== 'Cr24') {
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return buffer;
    }
    throw new Error('Not a valid CRX file');
  }

  const version = buffer.readUInt32LE(4);

  if (version === 3) {
    const headerLength = buffer.readUInt32LE(8);
    return buffer.slice(12 + headerLength);
  }
  
  if (version === 2) {
    const publicKeyLength = buffer.readUInt32LE(8);
    const signatureLength = buffer.readUInt32LE(12);
    return buffer.slice(16 + publicKeyLength + signatureLength);
  }

  throw new Error(`Unknown CRX version: ${version}`);
};


const extractZip = (zipBuffer, destDir) => {
  let eocdOffset = -1;
  
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer[i] === 0x50 && zipBuffer[i + 1] === 0x4B &&
        zipBuffer[i + 2] === 0x05 && zipBuffer[i + 3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP: cannot find end of central directory');
  }

  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);

  let offset = centralDirOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (zipBuffer[offset] !== 0x50 || zipBuffer[offset + 1] !== 0x4B ||
        zipBuffer[offset + 2] !== 0x01 || zipBuffer[offset + 3] !== 0x02) {
      throw new Error('Invalid ZIP: bad central directory entry');
    }

    const compressionMethod = zipBuffer.readUInt16LE(offset + 10);
    const compressedSize = zipBuffer.readUInt32LE(offset + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(offset + 24);
    const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
    const extraFieldLength = zipBuffer.readUInt16LE(offset + 30);
    const commentLength = zipBuffer.readUInt16LE(offset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);

    const fileName = zipBuffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);

    offset += 46 + fileNameLength + extraFieldLength + commentLength;

    if (fileName.endsWith('/') || fileName.includes('..')) {
      continue;
    }

    const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;

    const filePath = path.join(destDir, fileName);
    const fileDir = path.dirname(filePath);

    fs.mkdirSync(fileDir, { recursive: true });

    if (compressionMethod === 0) {
      const fileData = zipBuffer.slice(dataOffset, dataOffset + uncompressedSize);
      fs.writeFileSync(filePath, fileData);
    }
  
    else if (compressionMethod === 8) {
      const zlib = require('zlib');
      const compressedData = zipBuffer.slice(dataOffset, dataOffset + compressedSize);
      const decompressed = zlib.inflateRawSync(compressedData);
      fs.writeFileSync(filePath, decompressed);
    }
      
    else {
      console.warn(`Skipping ${fileName}: unsupported compression method ${compressionMethod}`);
    }
  }
};

const loadMeta = () => {
  try {
    if (fs.existsSync(EXTENSIONS_META_PATH)) {
      return JSON.parse(fs.readFileSync(EXTENSIONS_META_PATH, 'utf8'));
    }
  }

catch (e) {
    console.error('Error reading extensions metadata:', e);
  }
  return {};
};

const saveMeta = (meta) => {
  try {
    fs.writeFileSync(EXTENSIONS_META_PATH, JSON.stringify(meta, null, 2));
  }

  catch (e) {
    console.error('Error saving extensions metadata:', e);
  }
};

const getSession = () => session.fromPartition(PARTITION);

class ExtensionManager {
  constructor() {
    this.loaded = new Map(); 
  }

  async loadAllExtensions() {
    fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });

    const meta = loadMeta();

    for (const [extensionId, info] of Object.entries(meta)) {
      const extPath = path.join(EXTENSIONS_DIR, extensionId);

      if (!fs.existsSync(path.join(extPath, 'manifest.json'))) {
        console.warn(`Extension ${extensionId} missing manifest, skipping`);
        continue;
      }

      try {
        const ext = await getSession().extensions.loadExtension(extPath, { allowFileAccess: true });
        this.loaded.set(extensionId, ext);
        console.log(`Loaded extension: ${info.name || extensionId}`);
      }
     
      catch (e) {
        console.error(`Failed to load extension ${extensionId}:`, e);
      }
    }
  }

  async installExtension(url) {
    const extensionId = parseExtensionId(url);
    if (!extensionId) {
      throw new Error('Invalid Chrome Web Store URL. Paste a link like:\nhttps://chromewebstore.google.com/detail/extension-name/abcdefghijklmnop...');
    }

    if (this.loaded.has(extensionId)) {
      throw new Error('Extension is already installed.');
    }

    const extPath = path.join(EXTENSIONS_DIR, extensionId);

    const crxBuffer = await downloadFile(CRX_DOWNLOAD_URL(extensionId));

    const zipBuffer = extractZipFromCrx(crxBuffer);

    if (fs.existsSync(extPath)) {
      fs.rmSync(extPath, { recursive: true, force: true });
    }

    fs.mkdirSync(extPath, { recursive: true });

    extractZip(zipBuffer, extPath);

    const manifestPath = path.join(extPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      fs.rmSync(extPath, { recursive: true, force: true });
      throw new Error('Downloaded extension has no manifest.json — it may be invalid.');
    }

    let extensionName = extensionId;
    let warning = null;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      extensionName = manifest.name || extensionId;
      if (extensionName.startsWith('__MSG_')) {
        extensionName = extensionId;
      }

      if (manifest.manifest_version === 3 && manifest.background?.service_worker) {
        warning = 'This extension uses a Manifest V3 service worker, which has limited Electron support. It may not function correctly.';
      }
    }

    catch { }

    const ext = await getSession().extensions.loadExtension(extPath, { allowFileAccess: true });
    this.loaded.set(extensionId, ext);

    const meta = loadMeta();
    meta[extensionId] = {
      name: ext.name || extensionName,
      url: url.trim(),
      installedAt: Date.now(),
    };
    saveMeta(meta);

    return {
      id: extensionId,
      name: ext.name || extensionName,
      warning,
    };
  }

  async removeExtension(extensionId) {
    const ses = getSession();

    try {
      await ses.extensions.removeExtension(extensionId);
    }

    catch (e) {
      console.warn(`Could not unload extension ${extensionId}:`, e);
    }

    this.loaded.delete(extensionId);

    const extPath = path.join(EXTENSIONS_DIR, extensionId);
    if (fs.existsSync(extPath)) {
      fs.rmSync(extPath, { recursive: true, force: true });
    }

    const meta = loadMeta();
    delete meta[extensionId];
    saveMeta(meta);
  }

  getInstalledExtensions() {
    const meta = loadMeta();
    return Object.entries(meta).map(([id, info]) => ({
      id,
      name: info.name || id,
      url: info.url || '',
      installedAt: info.installedAt || 0,
      loaded: this.loaded.has(id),
      hasPopup: !!this.getPopupPath(id),
    }));
  }

  getPopupPath(extensionId) {
    const extPath = path.join(EXTENSIONS_DIR, extensionId);
    const manifestPath = path.join(extPath, 'manifest.json');

    try {
      if (!fs.existsSync(manifestPath)) return null;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      if (manifest.action?.default_popup) return manifest.action.default_popup;
      if (manifest.browser_action?.default_popup) return manifest.browser_action.default_popup;
      if (manifest.page_action?.default_popup) return manifest.page_action.default_popup;

      return null;
    } catch {
      return null;
    }
  }

  getPopupUrl(extensionId) {
    const popupPath = this.getPopupPath(extensionId);
    if (!popupPath) return null;
    return `chrome-extension://${extensionId}/${popupPath}`;
  }

  getIconPath(extensionId) {
    
    const extPath = path.join(EXTENSIONS_DIR, extensionId);
    const manifestPath = path.join(extPath, 'manifest.json');

    try {
      if (!fs.existsSync(manifestPath)) return null;
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const icons = manifest.icons || {};
      const action = manifest.action || manifest.browser_action || manifest.page_action || {};
      const actionIcons = action.default_icon;
      
      let iconFile = null;
      if (typeof actionIcons === 'string') {
        iconFile = actionIcons;
      }
      else if (actionIcons && typeof actionIcons === 'object') {
        const sizes = Object.keys(actionIcons).map(Number).sort((a, b) => b - a);
        if (sizes.length > 0) iconFile = actionIcons[sizes[0]];
      }
      else if (Object.keys(icons).length > 0) {
        const sizes = Object.keys(icons).map(Number).sort((a, b) => b - a);
        
        if (sizes.length > 0) iconFile = icons[sizes[0]];
      }

      if (iconFile) {
        const fullPath = path.join(extPath, iconFile);
        
        if (fs.existsSync(fullPath)) return fullPath;
      }

      return null;
    }

    catch {
      return null;
    }
  }
}

module.exports = new ExtensionManager();
