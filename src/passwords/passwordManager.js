const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const getPasswordFilePath = () => path.join(app.getPath('userData'), 'passwords.json');
const getSettingsFilePath = () => path.join(app.getPath('userData'), 'autofill-settings.json');

let passwords = null;
let settings = null;

const loadSettings = () => {
  
  if (settings) return settings;
  const filePath = getSettingsFilePath();
  if (fs.existsSync(filePath)) {
    try {
      settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    catch (e) {
      console.error("Error loading autofill settings:", e);
    }
  }
  
  if (!settings) {
    settings = {
      offerToSave: true,
      neverSaveOrigins: []
    };
  }
  return settings;
};

const saveSettings = () => {
  if (!settings) return;
  const filePath = getSettingsFilePath();
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  catch (e) {
    console.error("Error saving autofill settings:", e);
  }
};

const loadPasswords = () => {
  if (passwords) return passwords;
  const filePath = getPasswordFilePath();
  
  if (!fs.existsSync(filePath)) {
    passwords = [];
    return passwords;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    passwords = raw.map(item => {
      let decryptedPassword = '';
      
      if (item.encryptedPassword) {
        try {
          const buffer = Buffer.from(item.encryptedPassword, 'hex');
          if (safeStorage && safeStorage.isEncryptionAvailable()) {
            decryptedPassword = safeStorage.decryptString(buffer);
          }

          else {
            decryptedPassword = buffer.toString('utf-8'); // Fallback
          }
        }

        catch (e) {
          console.error(`Failed to decrypt password for ${item.origin}:`, e);
          decryptedPassword = '';
        }
      }

      else {
        decryptedPassword = item.password || '';
      }
      return {
        id: item.id || Math.random().toString(36).substr(2, 9),
        origin: item.origin,
        username: item.username,
        password: decryptedPassword
      };
    });
  }

  catch (e) {
    console.error("Error loading passwords file:", e);
    passwords = [];
  }
  return passwords;
};

const savePasswords = () => {
  if (!passwords) return;
  const filePath = getPasswordFilePath();
  
  try {
    const serialized = passwords.map(item => {
      let encryptedHex = '';
      
      if (item.password) {
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
          const encryptedBuffer = safeStorage.encryptString(item.password);
          encryptedHex = encryptedBuffer.toString('hex');
        }

        else {
          encryptedHex = Buffer.from(item.password).toString('hex'); 
        }
      }
      return {
        id: item.id,
        origin: item.origin,
        username: item.username,
        encryptedPassword: encryptedHex
      };
    });
    
    fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), 'utf-8');
  }

  catch (e) {
    console.error("Error writing passwords file:", e);
  }
};

const passwordManager = {
  getAutofillSettings() {
    return loadSettings();
  },

  setOfferToSave(enabled) {
    const s = loadSettings();
    s.offerToSave = Boolean(enabled);
    saveSettings();
  },

  isNeverSaveForOrigin(origin) {
    const s = loadSettings();
    return s.neverSaveOrigins.includes(origin);
  },

  neverSaveForOrigin(origin) {
    const s = loadSettings();
    if (!s.neverSaveOrigins.includes(origin)) {
      s.neverSaveOrigins.push(origin);
      saveSettings();
    }
  },

  removeNeverSaveForOrigin(origin) {
    const s = loadSettings();
    const index = s.neverSaveOrigins.indexOf(origin);
    if (index !== -1) {
      s.neverSaveOrigins.splice(index, 1);
      saveSettings();
    }
  },

  getAllCredentials() {
    return loadPasswords();
  },

  getCredentialsForOrigin(origin) {
    const list = loadPasswords();
    return list.filter(item => item.origin === origin);
  },

  saveCredential(origin, username, password) {
    if (this.isNeverSaveForOrigin(origin)) {
      return false;
    }

    const list = loadPasswords();
    const existingIndex = list.findIndex(item => item.origin === origin && item.username === username);

    if (existingIndex !== -1) {
      list[existingIndex].password = password;
    }
    else {
      list.push({
        id: 'pwd_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36),
        origin,
        username,
        password
      });
    }

    savePasswords();
    return true;
  },

  deleteCredential(id) {
    const list = loadPasswords();
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      list.splice(index, 1);
      savePasswords();
      return true;
    }
    return false;
  }
};

module.exports = passwordManager;
