const findBar = document.getElementById("find-bar");
const findInput = document.getElementById("find-input");
const findCloseButton = document.getElementById("find-close");

const closeFindBar = () => {
  findBar.classList.add("hidden");
  findInput.value = "";
  window.electronAPI.stopFindInPage();
};

export const setupFindBarUI = () => {
  window.electronAPI.onToggleFindBar(() => {
    findBar.classList.toggle("hidden");

    if (!findBar.classList.contains("hidden")) {
      setTimeout(() => findInput.focus(), 400);
      return;
    }

    window.electronAPI.stopFindInPage();
  });

  findInput.addEventListener("input", (event) => {
    window.electronAPI.searchInPage(event.target.value, { findNext: false });
  });

  findInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    window.electronAPI.searchInPage(event.target.value, {
      findNext: true,
      forward: !event.shiftKey,
    });
  });

  findCloseButton.addEventListener("click", closeFindBar);
};