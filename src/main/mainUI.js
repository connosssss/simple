
import { renderTabs } from '../tabs/TabUI.js';
import { setupSearchListeners, updateAddressBar } from '../addressBar/SearchUI.js';

        window.themeUtils.applyTheme();
        
        window.addEventListener("storage", (event) => {
            if (event.key === window.themeUtils.THEME_KEY) {
                window.themeUtils.applyTheme();
            }
        });
        
        window.addEventListener("theme-updated", () => window.themeUtils.applyTheme());

        if (window.electronAPI && window.electronAPI.onThemeUpdated) {
            window.electronAPI.onThemeUpdated(() => {
                window.themeUtils.applyTheme();
            });
        }

        
        document.getElementById("new-tab").onclick = () => window.electronAPI.createTab();
        document.getElementById("settings").addEventListener("click", () => window.electronAPI.showSettingsMenu());

        setupSearchListeners();

        let previousTabCount = null; 

        window.electronAPI.onUpdateTabs((tabs) => {
            renderTabs(tabs);
            
            const mainTab = tabs.find(t => t.isMainTab);
            if (mainTab) {
                updateAddressBar(mainTab.address);
                
                //

               
                if (previousTabCount !== null && tabs.length > previousTabCount && mainTab.index === tabs.length - 1) {
                  console.log(tabs.length);
                    setTimeout(() => {
                      const addressBar = document.getElementById('address-bar');
                    window.electronAPI.focusUI();
                    setTimeout(() => {
                      addressBar.focus();
                      addressBar.select();
                    }, 150);
                }, 200);
                  
                }
            }
            previousTabCount = tabs.length; 
        });

        window.electronAPI.onToggleFindBar(() => {
        const findBar = document.getElementById('find-bar');
        findBar.classList.toggle('hidden');

        if (!findBar.classList.contains('hidden')) {
          setTimeout(() => document.getElementById('find-input').focus(), 400);
        } 
        
        else {
          window.electronAPI.stopFindInPage();
        }
      });

    const findInput = document.getElementById('find-input');

    findInput.addEventListener('input', (e) => {
        window.electronAPI.searchInPage(e.target.value, { 
            findNext: false
        });
    });

    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            
            window.electronAPI.searchInPage(e.target.value, {
                findNext: true,       
                forward: !e.shiftKey  
            });
        }
    });


      document.getElementById('find-input').addEventListener('input', (e) => {
        window.electronAPI.searchInPage(e.target.value);
      });


      document.getElementById('find-close').addEventListener('click', () => {
        document.getElementById('find-bar').classList.add('hidden');
        document.getElementById('find-input').value = '';
        window.electronAPI.stopFindInPage();
      });