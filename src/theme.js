(() => {
  const THEME_KEY = "themeTheme";
  
  

  const DEFAULT_THEME = {
    color: "#0f172a",
    accent: "#334155",
    text: "#E2E8F0",
    overallOpacity: 0.5,
    accentOpacity: 0.6,
    gradientEnabled: false,
    gradientColors: ["#0f172a", "#334155"]
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(value || "");

  const hexToRgb = (hex) => {
    const clean = (hex || "").replace("#", "");
    if (clean.length !== 6) return { r: 15, g: 23, b: 42 };

    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
    
  };

  const rgba = (hex, alpha) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const parseGradientColors = (colors) => {
    const validColors = Array.isArray(colors) ? colors.filter(isHexColor) : [];
    return validColors.length >= 2 ? validColors : [...DEFAULT_THEME.gradientColors];
  };

  const themeBackground = (theme, opacity) => {
    if (!theme.gradientEnabled) return rgba(theme.color, opacity);
    return `linear-gradient(135deg, ${theme.gradientColors.map(color => rgba(color, opacity)).join(", ")})`;
  };
  

  const parseTheme = (savedTheme) => {
    if (!savedTheme) return { ...DEFAULT_THEME };
    const gradientColors = parseGradientColors(savedTheme.gradientColors);

    return {
      color: isHexColor(savedTheme.color) ? savedTheme.color : gradientColors[0],
      accent: savedTheme.accent || DEFAULT_THEME.accent,
      text: savedTheme.text || DEFAULT_THEME.text,
      overallOpacity: clamp(Number(savedTheme.overallOpacity ?? savedTheme.opacity ?? DEFAULT_THEME.overallOpacity), 0.02, 1),
      accentOpacity: clamp(Number(savedTheme.accentOpacity ?? DEFAULT_THEME.accentOpacity), 0.02, 1),
      gradientEnabled: Boolean(savedTheme.gradientEnabled),
      gradientColors
    };
  };

  const getTheme = () => {
    try {
      const savedTheme = JSON.parse(localStorage.getItem(THEME_KEY) || "{}");
      return parseTheme(savedTheme);
    }
    catch {
      return { ...DEFAULT_THEME };
    }
  };

  const applyTheme = () => {
    const theme = getTheme();
    const root = document.documentElement;

    root.style.setProperty("--theme-shell", themeBackground(theme, theme.overallOpacity));
    root.style.setProperty("--theme-panel", themeBackground(theme, Math.min(theme.overallOpacity + 0.14, 1)));
    root.style.setProperty("--theme-panel-strong", themeBackground(theme, Math.min(theme.overallOpacity + 0.26, 1)));
    root.style.setProperty("--theme-accent-soft", rgba(theme.accent, theme.accentOpacity));
    root.style.setProperty("--theme-resting", rgba(theme.color, Math.max(theme.overallOpacity * 0.35, 0.04)));
    root.style.setProperty("--theme-border", rgba(theme.accent, 0.55));
    root.style.setProperty("--theme-text", rgba(theme.text, 0.70));
    root.style.setProperty("--theme-accent", theme.accent);
    root.style.setProperty("--theme-bg-opaque", theme.color);

    const { r, g, b } = hexToRgb(theme.color);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    root.style.colorScheme = brightness < 128 ? "dark" : "light";

    return theme;
  };

  const saveTheme = (partialTheme) => {
    const nextTheme = parseTheme({
      ...getTheme(),
      ...partialTheme
    });

    nextTheme.overallOpacity = clamp(Number(nextTheme.overallOpacity), 0.02, 1);
    nextTheme.accentOpacity = clamp(Number(nextTheme.accentOpacity), 0.02, 1);
    delete nextTheme.opacity;
    
    
    localStorage.setItem(THEME_KEY, JSON.stringify(nextTheme));
    applyTheme();

    if (window.electronAPI?.saveThemeToFile) {
      window.electronAPI.saveThemeToFile(nextTheme);
    }
    
    window.dispatchEvent(new Event("theme-updated"));
  };

  const resetTheme = () => {
    localStorage.setItem(THEME_KEY, JSON.stringify(DEFAULT_THEME));
    applyTheme();

    if (window.electronAPI?.saveThemeToFile) {
      window.electronAPI.saveThemeToFile(DEFAULT_THEME);
    }

    window.dispatchEvent(new Event("theme-updated"));
  };

  const initThemeFromFile = async () => {
    if (window.electronAPI?.loadThemeFromFile) {
      try {
        const fileTheme = await window.electronAPI.loadThemeFromFile();
        if (fileTheme) {
          const theme = parseTheme(fileTheme);
          localStorage.setItem(THEME_KEY, JSON.stringify(theme));
          applyTheme();
        }
      } 
      
      catch (e) {
        console.error("Failed to load theme from file:", e);
      }
    }
  };

  initThemeFromFile();

  if (window.electronAPI?.onThemeUpdated) {
    window.electronAPI.onThemeUpdated(() => {
      initThemeFromFile();
    });
  }

  window.themeUtils = {
    THEME_KEY,
    getTheme,
    applyTheme,
    saveTheme,
    resetTheme
  };
  
})();
