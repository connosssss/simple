const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function registerAsBrowser() {
  if (process.platform !== 'win32') return;

  const exePath = process.execPath;
  const appName = "SimpleBrowser";
  const displayName = "Simple Browser";
  const progId = "SimpleHTML";

  // Escape backslashes for command line argument values
  const escapedExePath = exePath.replace(/\\/g, '\\\\');

  const commands = [
    // 1. Clients\StartMenuInternet registration
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}" /ve /t REG_SZ /d "${displayName}" /f`,
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\DefaultIcon" /ve /t REG_SZ /d "${escapedExePath},0" /f`,
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\shell\\open\\command" /ve /t REG_SZ /d "\\"${escapedExePath}\\"" /f`,
    
    // 2. Capabilities
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities" /v "ApplicationName" /t REG_SZ /d "${displayName}" /f`,
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities" /v "ApplicationDescription" /t REG_SZ /d "Simple web browser built with Electron" /f`,
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities" /v "ApplicationIcon" /t REG_SZ /d "${escapedExePath},0" /f`,
    
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\FileAssociations" /v ".html" /t REG_SZ /d "${progId}" /f`,
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\FileAssociations" /v ".htm" /t REG_SZ /d "${progId}" /f`,
    
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\URLAssociations" /v "http" /t REG_SZ /d "${progId}" /f`,
    `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\URLAssociations" /v "https" /t REG_SZ /d "${progId}" /f`,

    // 3. RegisteredApplications
    `reg add "HKCU\\Software\\RegisteredApplications" /v "${appName}" /t REG_SZ /d "Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities" /f`,

    // 4. ProgID Classes Registration for HTTP/HTTPS/HTML files
    `reg add "HKCU\\Software\\Classes\\${progId}" /ve /t REG_SZ /d "${displayName} Document" /f`,
    `reg add "HKCU\\Software\\Classes\\${progId}" /v "FriendlyTypeName" /t REG_SZ /d "${displayName} Document" /f`,
    `reg add "HKCU\\Software\\Classes\\${progId}\\DefaultIcon" /ve /t REG_SZ /d "${escapedExePath},0" /f`,
    `reg add "HKCU\\Software\\Classes\\${progId}\\shell\\open\\command" /ve /t REG_SZ /d "\\"${escapedExePath}\\" \\"%1\\"" /f`
  ];

  const tempBatPath = path.join(app.getPath('temp'), 'register_browser.bat');
  const batContent = '@echo off\r\n' + commands.join('\r\n') + '\r\n';

  try {
    fs.writeFileSync(tempBatPath, batContent);
    exec(`"${tempBatPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error('[Registry] Failed to register browser:', err);
      } else {
        console.log('[Registry] Browser registered successfully in registry.');
      }
      try {
        fs.unlinkSync(tempBatPath);
      } catch (e) {}
    });
  } catch (err) {
    console.error('[Registry] Failed to write registry batch file:', err);
  }
}

module.exports = {
  registerAsBrowser
};
