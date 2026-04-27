



(() => {
  const THEME_KEY = "themeTheme";
  
  
  
  const DEFAULT_THEME = {
    color: "#0f172a",
    accent: "#334155",
    overallOpacity: 0.5,
    accentOpacity: 0.6
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
  
  

  const getTheme = () => {
    
    try {
      const savedTheme = JSON.parse(localStorage.getItem(THEME_KEY) || "{}");
      
      return {
        color: savedTheme.color || DEFAULT_THEME.color,
        accent: savedTheme.accent || DEFAULT_THEME.accent,
        overallOpacity: clamp(Number(savedTheme.overallOpacity ?? savedTheme.opacity ?? DEFAULT_THEME.overallOpacity), 0.02, 1),
        accentOpacity: clamp(Number(savedTheme.accentOpacity ?? DEFAULT_THEME.accentOpacity), 0.02, 1)
      };
    }
    
    catch {
      return { ...DEFAULT_THEME };
    }
  };

  const applyTheme = () => {
    const theme = getTheme();
    const root = document.documentElement;

    root.style.setProperty("--theme-shell", rgba(theme.color, theme.overallOpacity));
    root.style.setProperty("--theme-panel", rgba(theme.color, Math.min(theme.overallOpacity + 0.14, 1)));
    root.style.setProperty("--theme-panel-strong", rgba(theme.color, Math.min(theme.overallOpacity + 0.26, 1)));
    root.style.setProperty("--theme-accent-soft", rgba(theme.accent, theme.accentOpacity));
    root.style.setProperty("--theme-resting", rgba(theme.color, Math.max(theme.overallOpacity * 0.35, 0.04)));
    root.style.setProperty("--theme-border", rgba(theme.accent, 0.55));

    return theme;
  };

  const saveTheme = (partialTheme) => {
    const nextTheme = {
      ...getTheme(),
      ...partialTheme
    };

    nextTheme.overallOpacity = clamp(Number(nextTheme.overallOpacity), 0.02, 1);
    nextTheme.accentOpacity = clamp(Number(nextTheme.accentOpacity), 0.02, 1);
    delete nextTheme.opacity;
    
    
    localStorage.setItem(THEME_KEY, JSON.stringify(nextTheme));
    applyTheme();
    
    
    window.dispatchEvent(new Event("theme-updated"));
  };

  window.themeUtils = {
    THEME_KEY,
    getTheme,
    applyTheme,
    saveTheme
  };
  
})();
