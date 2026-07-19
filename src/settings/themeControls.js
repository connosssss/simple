const hexToRgb = (hex) => {
  const clean = (hex || "").replace("#", "");
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
};

const rgbToHex = (r, g, b) => {
  const toHex = (c) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const interpolateColor = (color1, color2, factor) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = c1.r + factor * (c2.r - c1.r);
  const g = c1.g + factor * (c2.g - c1.g);
  const b = c1.b + factor * (c2.b - c1.b);
  return rgbToHex(r, g, b);
};

const hexToHsl = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  }

  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

const hslToHex = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; 
  }

  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
};

let selectedStopIndex = 0;
let isInteracting = false;

const syncThemeControls = () => {
  const theme = window.themeUtils.getTheme();
  const gradientEnabled = document.getElementById("theme-gradient-enabled");
  const gradientPanel = document.getElementById("theme-gradient-panel");
  const gradientPreview = document.getElementById("theme-gradient-preview");
  const gradientHandles = document.getElementById("theme-gradient-handles");

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
  gradientPreview.style.background = `linear-gradient(to right, ${theme.gradientColors.join(", ")})`;

  if (!theme.gradientEnabled) return;

  if (selectedStopIndex >= theme.gradientColors.length) {
    selectedStopIndex = Math.max(0, theme.gradientColors.length - 1);
  }

  
  if (isInteracting) {
    updateInPlace(theme);
    return;
  }

  gradientHandles.innerHTML = "";
  const N = theme.gradientColors.length;
  theme.gradientColors.forEach((stopStr, i) => {
    const parts = stopStr.trim().split(/\s+/);
    const color = parts[0];
    const pct = parts[1] ? parseInt(parts[1]) : Math.round((i / (N - 1)) * 100);

    const handle = document.createElement("div");
    handle.className = `gradient-handle${i === selectedStopIndex ? " selected" : ""}`;
    handle.style.left = `${pct}%`;

    const arrow = document.createElement("div");
    arrow.className = "handle-arrow";

    const swatch = document.createElement("div");
    swatch.className = "handle-swatch";
    swatch.style.backgroundColor = color;

    handle.append(arrow, swatch);

    handle.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      selectedStopIndex = i;
      syncThemeControls();

      isInteracting = true;

      const onPointerMove = (moveEvent) => {
        const theme = window.themeUtils.getTheme();
        const rect = gradientPreview.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, Math.round(((moveEvent.clientX - rect.left) / rect.width) * 100)));
        
        const nextColors = [...theme.gradientColors];
        const color = nextColors[selectedStopIndex].split(/\s+/)[0];
        nextColors[selectedStopIndex] = `${color} ${pct}%`;

        handle.style.left = `${pct}%`;
        
        window.themeUtils.saveTheme({ gradientColors: nextColors });
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        
        isInteracting = false;

        const theme = window.themeUtils.getTheme();
        const nextColors = [...theme.gradientColors];
        const parsedStops = nextColors.map((s, idx) => {
          const parts = s.trim().split(/\s+/);
          const color = parts[0];
          const pct = parts[1] ? parseInt(parts[1]) : Math.round((idx / (nextColors.length - 1)) * 100);
          return { color, pct };
        });

        const draggedColor = parsedStops[selectedStopIndex].color;
        const draggedPct = parsedStops[selectedStopIndex].pct;

        parsedStops.sort((a, b) => a.pct - b.pct);

        const finalColors = parsedStops.map(stop => `${stop.color} ${stop.pct}%`);
        
        selectedStopIndex = parsedStops.findIndex(stop => stop.color === draggedColor && stop.pct === draggedPct);
        if (selectedStopIndex === -1) selectedStopIndex = 0;

        window.themeUtils.saveTheme({ gradientColors: finalColors });
        syncThemeControls();
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });

    gradientHandles.append(handle);
  });

  const activeColorStop = theme.gradientColors[selectedStopIndex];
  const activeColor = activeColorStop.split(/\s+/)[0];
  
  const hexInput = document.getElementById("stop-hex");
  if (document.activeElement !== hexInput) {
    hexInput.value = activeColor.replace("#", "").toUpperCase();
  }

  document.getElementById("stop-swatch").style.backgroundColor = activeColor;
  document.getElementById("stop-native-picker").value = activeColor;

  const hsl = hexToHsl(activeColor);
  document.getElementById("stop-hue").value = hsl.h;
  document.getElementById("stop-lightness").value = hsl.l;

  const lightnessSlider = document.getElementById("stop-lightness");
  lightnessSlider.style.background = `linear-gradient(to right, #000000, hsl(${hsl.h}, ${hsl.s}%, 50%), #ffffff)`;

  document.getElementById("delete-stop-btn").disabled = theme.gradientColors.length <= 2;
};

const updateInPlace = (theme) => {
  const activeColorStop = theme.gradientColors[selectedStopIndex];
  const activeColor = activeColorStop.split(/\s+/)[0];

  document.getElementById("theme-gradient-preview").style.background = `linear-gradient(to right, ${theme.gradientColors.join(", ")})`;

  const handles = document.getElementById("theme-gradient-handles").children;
  if (handles[selectedStopIndex]) {
    const swatch = handles[selectedStopIndex].querySelector(".handle-swatch");
    if (swatch) swatch.style.backgroundColor = activeColor;
    
    const parts = activeColorStop.trim().split(/\s+/);
    
    if (parts[1]) {
      handles[selectedStopIndex].style.left = parts[1];
    }
  }

  document.getElementById("stop-swatch").style.backgroundColor = activeColor;
  document.getElementById("stop-native-picker").value = activeColor;

  const hexInput = document.getElementById("stop-hex");
  if (document.activeElement !== hexInput) {
    hexInput.value = activeColor.replace("#", "").toUpperCase();
  }

  const hsl = hexToHsl(activeColor);
  const lightnessSlider = document.getElementById("stop-lightness");
  lightnessSlider.style.background = `linear-gradient(to right, #000000, hsl(${hsl.h}, ${hsl.s}%, 50%), #ffffff)`;
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

  document.getElementById("theme-gradient-preview").addEventListener("click", (event) => {
    const theme = window.themeUtils.getTheme();
    if (!theme.gradientEnabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const newPct = Math.round(t * 100);

    const N = theme.gradientColors.length;
    let newColor;
    let nextColors = [...theme.gradientColors];

    const parsedStops = nextColors.map((stopStr, idx) => {
      const parts = stopStr.trim().split(/\s+/);
      const color = parts[0];
      const pct = parts[1] ? parseInt(parts[1]) : Math.round((idx / (nextColors.length - 1)) * 100);
      return { color, pct, index: idx };
    });

    if (N < 2) {
      newColor = theme.accent;
      nextColors.push(`${newColor} ${newPct}%`);
      selectedStopIndex = nextColors.length - 1;
    } else {
      const sortedStops = [...parsedStops].sort((a, b) => a.pct - b.pct);
      
      let colorLeft = sortedStops[0].color;
      let colorRight = sortedStops[sortedStops.length - 1].color;
      let pctLeft = sortedStops[0].pct;
      let pctRight = sortedStops[sortedStops.length - 1].pct;

      for (let i = 0; i < sortedStops.length - 1; i++) {
        if (newPct >= sortedStops[i].pct && newPct <= sortedStops[i + 1].pct) {
          colorLeft = sortedStops[i].color;
          colorRight = sortedStops[i + 1].color;
          pctLeft = sortedStops[i].pct;
          pctRight = sortedStops[i + 1].pct;
          break;
        }
        
      }

      const factor = pctRight === pctLeft ? 0.5 : (newPct - pctLeft) / (pctRight - pctLeft);
      newColor = interpolateColor(colorLeft, colorRight, factor);

      const newStop = { color: newColor, pct: newPct };
      const allStops = [...parsedStops.map(s => ({ color: s.color, pct: s.pct })), newStop];
      allStops.sort((a, b) => a.pct - b.pct);

      nextColors = allStops.map(s => `${s.color} ${s.pct}%`);
      selectedStopIndex = allStops.findIndex(s => s.color === newColor && s.pct === newPct);
      if (selectedStopIndex === -1) selectedStopIndex = 0;
    }

    window.themeUtils.saveTheme({ gradientColors: nextColors });
  });

  const hueSlider = document.getElementById("stop-hue");
  hueSlider.addEventListener("input", (e) => {
    isInteracting = true;
    const theme = window.themeUtils.getTheme();
    const activeColorStop = theme.gradientColors[selectedStopIndex];
    const parts = activeColorStop.trim().split(/\s+/);
    const activeColor = parts[0];
    const pctStr = parts[1] || "";
    
    const hsl = hexToHsl(activeColor);
    
    let s = hsl.s;
    if (s <= 10) {
      s = 80;
    }
    
    const newHex = hslToHex(Number(e.target.value), s, hsl.l);
    const nextColors = [...theme.gradientColors];
    nextColors[selectedStopIndex] = pctStr ? `${newHex} ${pctStr}` : newHex;
    window.themeUtils.saveTheme({ gradientColors: nextColors });
  });

  hueSlider.addEventListener("change", () => {
    isInteracting = false;
    syncThemeControls();
  });

  const lightnessSlider = document.getElementById("stop-lightness");
  lightnessSlider.addEventListener("input", (e) => {
    isInteracting = true;
    const theme = window.themeUtils.getTheme();
    const activeColorStop = theme.gradientColors[selectedStopIndex];
    const parts = activeColorStop.trim().split(/\s+/);
    const activeColor = parts[0];
    const pctStr = parts[1] || "";
    
    const hsl = hexToHsl(activeColor);
    
    const newHex = hslToHex(hsl.h, hsl.s, Number(e.target.value));
    const nextColors = [...theme.gradientColors];
    nextColors[selectedStopIndex] = pctStr ? `${newHex} ${pctStr}` : newHex;
    window.themeUtils.saveTheme({ gradientColors: nextColors });
  });

  lightnessSlider.addEventListener("change", () => {
    isInteracting = false;
    syncThemeControls();
  });

  const hexInput = document.getElementById("stop-hex");
  hexInput.addEventListener("input", (e) => {
    let val = e.target.value.replace(/[^0-9a-fA-F]/g, "");
    e.target.value = val.toUpperCase();
    
    if (val.length === 6) {
      isInteracting = true;
      const theme = window.themeUtils.getTheme();
      const activeColorStop = theme.gradientColors[selectedStopIndex];
      const parts = activeColorStop.trim().split(/\s+/);
      const pctStr = parts[1] || "";
      
      const newHex = `#${val.toLowerCase()}`;
      const nextColors = [...theme.gradientColors];
      nextColors[selectedStopIndex] = pctStr ? `${newHex} ${pctStr}` : newHex;
      window.themeUtils.saveTheme({ gradientColors: nextColors });
    }
  });

  hexInput.addEventListener("change", () => {
    isInteracting = false;
    syncThemeControls();
  });

  hexInput.addEventListener("blur", () => {
    isInteracting = false;
    syncThemeControls();
  });

  const swatchBtn = document.getElementById("stop-swatch");
  const nativePicker = document.getElementById("stop-native-picker");

  swatchBtn.addEventListener("click", () => {
    nativePicker.click();
  });

  nativePicker.addEventListener("input", (e) => {
    isInteracting = true;
    const theme = window.themeUtils.getTheme();
    const activeColorStop = theme.gradientColors[selectedStopIndex];
    const parts = activeColorStop.trim().split(/\s+/);
    const pctStr = parts[1] || "";
    
    const newHex = e.target.value;
    const nextColors = [...theme.gradientColors];
    nextColors[selectedStopIndex] = pctStr ? `${newHex} ${pctStr}` : newHex;
    window.themeUtils.saveTheme({ gradientColors: nextColors });
  });

  nativePicker.addEventListener("change", () => {
    isInteracting = false;
    syncThemeControls();
  });

  const deleteBtn = document.getElementById("delete-stop-btn");
  deleteBtn.addEventListener("click", () => {
    const theme = window.themeUtils.getTheme();
    if (theme.gradientColors.length <= 2) return;

    const nextColors = theme.gradientColors.filter((_, i) => i !== selectedStopIndex);
    selectedStopIndex = Math.max(0, selectedStopIndex - 1);
    window.themeUtils.saveTheme({ gradientColors: nextColors });
  });

  document.getElementById("reset-theme-btn").addEventListener("click", () => {
    window.themeUtils.resetTheme();
  });
};
