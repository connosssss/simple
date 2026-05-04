export const setupExtensionsUI = () => {
  const extensionsMenuBtn = document.getElementById("extensions-menu");

  extensionsMenuBtn.addEventListener("click", () => {
    const rect = extensionsMenuBtn.getBoundingClientRect();
    const bounds = {
      x: window.screenX + rect.right,
      y: window.screenY + rect.bottom,
    };
    
    window.electronAPI.showExtensionsMenu(bounds);
    
  });
};
