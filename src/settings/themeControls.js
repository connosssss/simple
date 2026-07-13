let editingGradientColor = false;

const syncThemeControls = () => {
  const theme = window.themeUtils.getTheme();
  const gradientEnabled = document.getElementById("theme-gradient-enabled");
  const gradientPanel = document.getElementById("theme-gradient-panel");
  const gradientPreview = document.getElementById("theme-gradient-preview");
  const gradientColors = document.getElementById("theme-gradient-colors");
  const addGradientColor = document.getElementById("add-gradient-color");

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

  gradientEnabled.checked = theme.gradientEnabled;
  gradientPanel.hidden = !theme.gradientEnabled;
  gradientPreview.style.background = `linear-gradient(135deg, ${theme.gradientColors.join(", ")})`;
  addGradientColor.disabled = !theme.gradientEnabled;

  if (editingGradientColor && gradientColors.children.length === theme.gradientColors.length) {
    [...gradientColors.children].forEach((row, index) => {
      row.querySelector(".gradient-stop-label").textContent = `Gradient ${index + 1}`;
      row.querySelector(".gradient-stop-value").textContent = theme.gradientColors[index];
      row.querySelector("button").disabled = !theme.gradientEnabled || theme.gradientColors.length <= 2;
    });
    return;
  }

  gradientColors.innerHTML = "";

  theme.gradientColors.forEach((color, index) => {
    const row = document.createElement("div");
    row.className = "gradient-stop-row p-2 rounded-sm bg-black/10";

    const label = document.createElement("div");
    label.className = "min-w-0";
    const title = document.createElement("div");
    title.className = "gradient-stop-label font-semibold text-slate-200";
    title.textContent = `Gradient ${index + 1}`;
    const value = document.createElement("div");
    value.className = "gradient-stop-value text-[10px] text-slate-400 uppercase";
    value.textContent = color;
    label.append(title, value);

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-2";

    const input = document.createElement("input");
    input.type = "color";
    input.value = color;
    input.disabled = !theme.gradientEnabled;
    
    input.addEventListener("pointerdown", () => {
      editingGradientColor = true;
    });
    
    input.addEventListener("input", (event) => {
      editingGradientColor = true;
      const nextColors = [...window.themeUtils.getTheme().gradientColors];
      nextColors[index] = event.target.value;
      window.themeUtils.saveTheme({ gradientColors: nextColors, color: nextColors[0] });
    });
    
    input.addEventListener("change", () => {
      editingGradientColor = false;
      syncThemeControls();
    });
    
    input.addEventListener("blur", () => {
      editingGradientColor = false;
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "px-2 py-1 text-[10px] rounded btn-theme";
    removeButton.textContent = "Remove";
    removeButton.disabled = !theme.gradientEnabled || theme.gradientColors.length <= 2;

    removeButton.addEventListener("click", () => {
      window.themeUtils.saveTheme({
        gradientColors: window.themeUtils.getTheme().gradientColors.filter((_, colorIndex) => colorIndex !== index)
      });
    });

    controls.append(input, removeButton);
    row.append(label, controls);
    gradientColors.append(row);
  });
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
    const theme = window.themeUtils.getTheme();
    window.themeUtils.saveTheme({
      color: event.target.value,
      gradientColors: theme.gradientEnabled ? [event.target.value, ...theme.gradientColors.slice(1)] : theme.gradientColors
    });
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

  document.getElementById("theme-gradient-enabled").addEventListener("change", (event) => {
    window.themeUtils.saveTheme({ gradientEnabled: event.target.checked });
  });

  document.getElementById("add-gradient-color").addEventListener("click", () => {
    const theme = window.themeUtils.getTheme();
    window.themeUtils.saveTheme({ gradientColors: [...theme.gradientColors, theme.accent] });
  });

  document.getElementById("reset-theme-btn").addEventListener("click", () => {
    window.themeUtils.resetTheme();
  });
};
