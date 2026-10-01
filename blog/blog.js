(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const menuToggle = document.querySelector("[data-menu]");
  const nav = document.getElementById("navigation");
  const logo = document.querySelector("[data-brand-logo]");

  const setTheme = (theme) => {
    const next = theme === "dark" ? "dark" : "light";
    root.dataset.theme = next;
    document.body.dataset.theme = next;
    if (logo) logo.src = logo.dataset[`${next}Src`];
    if (themeToggle) {
      themeToggle.textContent = next === "dark" ? "Light" : "Dark";
      themeToggle.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    try {
      localStorage.setItem("breakwater-theme", next);
    } catch (_) {}
  };

  let stored;
  try {
    stored = localStorage.getItem("breakwater-theme");
  } catch (_) {}
  if (stored) setTheme(stored);
  else if (themeToggle) setTheme(root.dataset.theme);

  themeToggle?.addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    nav?.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });
  nav?.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    nav.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav?.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      menuToggle?.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  });

  document.querySelectorAll("[data-year]").forEach((n) => {
    n.textContent = String(new Date().getFullYear());
  });
})();
