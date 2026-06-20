const closeAfterSelect = document.getElementById("close-after-select");
const siteChoiceBar = document.getElementById("siteChoiceBar");
const searchEngineSelect = document.getElementById("search-engine-select");

export const setupHibernationControls = () => {
  
  let closeAfter = parseInt(localStorage.getItem("closeAfter"), 10) || 10;
  let defaultSite = "https://google.com";

  
  closeAfterSelect.value = closeAfter;
  closeAfterSelect.addEventListener("change", (event) => {
    closeAfter = parseInt(event.target.value, 10);
    localStorage.setItem("closeAfter", closeAfter);
    window.electronAPI.updateCloseAfter(closeAfter);
    
  });

  siteChoiceBar.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    defaultSite = siteChoiceBar.value;
    window.electronAPI.updateDefaultSite(defaultSite);
  });

  searchEngineSelect.addEventListener("change", (event) => {
    window.electronAPI.updateSearchEngine(event.target.value);
  });

  const uiPositionSelect = document.getElementById("ui-position-select");
  if (uiPositionSelect) {
    uiPositionSelect.addEventListener("change", (event) => {
      window.electronAPI.updateUiPosition(event.target.value);
    });
  }

  return {
    updateSettings(settings) {
      if (settings.defaultSite) {
        defaultSite = settings.defaultSite;
        siteChoiceBar.value = defaultSite;
      }

      if (settings.searchEngine) {
        searchEngineSelect.value = settings.searchEngine;
      }

      if (settings.closeAfter !== undefined) {
        closeAfter = settings.closeAfter;
        closeAfterSelect.value = closeAfter;
        localStorage.setItem("closeAfter", closeAfter);
      }

      if (settings.uiPosition && uiPositionSelect) {
        uiPositionSelect.value = settings.uiPosition;
      }
    },
  };
};