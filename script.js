(() => {
  const FORM_ENDPOINT =
    window.BREAKWATER_FORM_ENDPOINT ||
    "https://script.google.com/macros/s/AKfycbwDKJk38q6oQMQ7MA_R2pBSxa6XjFsbJjcaAW1vu5eq6zEhZt_qU-5DpltcO0CGLNOK/exec";
  const root = document.documentElement;
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");

  const setTheme = (theme) => {
    const nextTheme = theme === "light" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    themeToggle?.setAttribute(
      "aria-label",
      `Switch to ${nextTheme === "dark" ? "light" : "dark"} theme`,
    );
    try {
      localStorage.setItem("breakwater-theme", nextTheme);
    } catch (_) {
      // Storage may be unavailable in hardened browsers; the toggle still works.
    }
  };

  const closeMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    mobileMenu.hidden = true;
    document.body.classList.remove("menu-open");
  };

  if (themeToggle) {
    setTheme(root.dataset.theme);
    themeToggle.addEventListener("click", () => {
      setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      mobileMenu.hidden = isOpen;
      document.body.classList.toggle("menu-open", !isOpen);
    });
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !mobileMenu.hidden) {
        closeMenu();
        menuToggle.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1040) closeMenu();
    });
  }

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const setStatus = (form, message, tone = "neutral") => {
    const status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector("button[type='submit']");
      const honey = form.querySelector("input[name='website']");

      if (honey?.value) {
        setStatus(form, "Thanks. We'll follow up shortly.", "success");
        form.reset();
        return;
      }

      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      setStatus(form, "Sending inquiry…");

      const data = new FormData(form);
      data.append("submitted_at", new Date().toISOString());
      data.append("page_url", window.location.href);

      try {
        await fetch(FORM_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          body: data,
        });
        setStatus(
          form,
          "Submission sent. Delivery cannot be confirmed in this page; email hello@bwtr.ai if you do not hear back.",
          "success",
        );
        form.reset();
      } catch (error) {
        console.error(error);
        setStatus(
          form,
          "We could not submit the form. Please email hello@bwtr.ai.",
          "error",
        );
      } finally {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
      }
    });
  });
})();
