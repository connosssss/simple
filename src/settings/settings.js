document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".sidebar-item");
  const sections = document.querySelectorAll(".settings-section");
  const searchInput = document.getElementById("settings-search");
  const pageTitle = document.getElementById("settings-page-title");
  
  let lastActiveTarget = "appearance";

  function selectCategory(targetId) {
    
    items.forEach(btn => {
      if (btn.getAttribute("data-target") === targetId) {
        btn.classList.add("active");
      } 
      else {
        btn.classList.remove("active");
      }
    });

    if (pageTitle) {
      pageTitle.textContent = targetId;
    }

    sections.forEach(sec => {
      const secTarget = sec.getAttribute("data-section");

      if (targetId === "all") {
        sec.style.display = "block";
      } 
      
      else if (secTarget === targetId) {
        sec.style.display = "block";
      } 
      
      else {
        sec.style.display = "none";
      }
    });
  }

  items.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      lastActiveTarget = target;
      
      searchInput.value = "";
      selectCategory(target);
      
      document.getElementById("settings-content-area").scrollTop = 0;
    });
  });

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      selectCategory(lastActiveTarget);
      return;
    }

    if (pageTitle) {
      pageTitle.textContent = "Search Results: " + query;
    }

    sections.forEach(sec => {
      const secText = sec.textContent.toLowerCase();
      
      if (secText.includes(query)) {
        sec.style.display = "block";
        
        const elements = sec.querySelectorAll(".settings-card > div, label, tr");

        elements.forEach(el => {
          if (el.textContent.toLowerCase().includes(query)) {
            el.style.display = "";
          } 
          
          else {
            if (el.classList.contains("grid") || el.tagName === "LABEL" || el.tagName === "TR") {
              el.style.display = "none";
            }
          }
        });
      } 
      
      else {
        sec.style.display = "none";
      }
    });
  });

  selectCategory("appearance");
});
