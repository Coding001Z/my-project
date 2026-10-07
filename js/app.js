(function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector("#sidebar");
  const sidebarScrim = document.querySelector(".sidebar-scrim");
  const navigationLinks = document.querySelectorAll(".primary-nav a");
  const mobileViewport = window.matchMedia("(max-width: 800px)");

  if (!sidebar || !menuToggle || !sidebarScrim) {
    throw new Error("เมนูนำทางไม่พร้อมใช้งาน: ตรวจสอบโครงสร้าง sidebar ในหน้าปัจจุบัน");
  }

  function setMenuOpen(isOpen) {
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "ปิดเมนู" : "เปิดเมนู");
    const isHidden = mobileViewport.matches && !isOpen;
    sidebar.inert = isHidden;
    sidebar.setAttribute("aria-hidden", String(isHidden));
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!isOpen);
    if (!isOpen && mobileViewport.matches) {
      sidebar.querySelector("a")?.focus();
    }
  });

  sidebarScrim.addEventListener("click", () => {
    setMenuOpen(false);
    menuToggle.focus();
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setMenuOpen(false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });

  mobileViewport.addEventListener("change", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") === "true");
  });

  setMenuOpen(false);
})();
