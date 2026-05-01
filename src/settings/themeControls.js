const syncThemeControls = () => {
  const theme = window.themeUtils.getTheme();

  document.getElementById("theme-color").value = theme.color;
  document.getElementById("theme-accent").value = theme.accent;
  document.getElementById("theme-text").value = theme.text;
  document.getElementById("theme-overall-opacity").value = theme.overallOpacity;
  document.getElementById("theme-accent-opacity").value = theme.accentOpacity;

  document.getElementById("theme-color-value").textContent = theme.color;
  document.getElementById("theme-accent-value").textContent = theme.accent;
  document.getElementById("theme-text-value").textContent = theme.text;
  document.getElementById("theme-overall-opacity-value").textContent = `${Math.round(theme.overallOpacity * 100)}%`;
  document.getElementById("theme-accent-opacity-value").textContent = `${Math.round(theme.accentOpacity * 100)}%`;
};

export const setupThemeControls = () => {
  window.themeUtils.applyTheme();
  syncThemeControls();

  window.addEventListener("storage", (event) => {
    if (event.key === window.themeUtils.THEME_KEY) {
      syncThemeControls();
      window.themeUtils.applyTheme();
    }
  });

  window.addEventListener("theme-updated", () => {
    syncThemeControls();
    window.themeUtils.applyTheme();

    if (window.electronAPI?.broadcastThemeUpdate) {
      window.electronAPI.broadcastThemeUpdate();
    }
  });

  document.getElementById("theme-color").addEventListener("input", (event) => {
    window.themeUtils.saveTheme({ color: event.target.value });
  });

  document.getElementById("theme-accent").addEventListener("input", (event) => {
    window.themeUtils.saveTheme({ accent: event.target.value });
  });

  document.getElementById("theme-text").addEventListener("input", (event) => {
    window.themeUtils.saveTheme({ text: event.target.value });
  });

  document.getElementById("theme-overall-opacity").addEventListener("input", (event) => {
    window.themeUtils.saveTheme({ overallOpacity: Number(event.target.value) });
  });

  document.getElementById("theme-accent-opacity").addEventListener("input", (event) => {
    window.themeUtils.saveTheme({ accentOpacity: Number(event.target.value) });
  });
};
