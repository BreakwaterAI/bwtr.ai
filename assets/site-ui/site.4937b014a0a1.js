(() => {
  const menu = document.querySelector('[data-menu]');
  const nav = document.querySelector('.nav-links');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) { nav.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); }
  });
  nav?.addEventListener('focusin', event => {
    // Some browsers reveal only part of a focused link at high zoom.
    if (matchMedia('(max-width: 760px) and (max-height: 450px)').matches) {
      event.target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('open')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.focus(); }
  });
  document.body.dataset.navigationReady = 'true';
  const theme = document.querySelector('[data-theme-toggle]');
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.body.dataset.theme = dark ? 'dark' : 'light';
    const logo = document.querySelector('[data-brand-logo]');
    if (logo) {
      const variant = dark ? 'dark' : 'light';
      logo.srcset = `/assets/product-proof/brand-${variant}-340.webp 340w, /assets/product-proof/brand-${variant}-510.webp 510w`;
      logo.src = `/assets/product-proof/brand-${variant}-340.webp`;
    }
    if (theme) {
      theme.textContent = dark ? 'Light' : 'Dark';
      theme.setAttribute('aria-label', dark ? 'Light theme' : 'Dark theme');
    }
  }
  applyTheme(document.documentElement.dataset.theme === 'dark');
  theme?.addEventListener('click', () => {
    applyTheme(document.body.dataset.theme !== 'dark');
    try { localStorage.setItem('breakwater-theme', document.body.dataset.theme); } catch { /* Still usable without storage. */ }
  });
  if (theme) theme.hidden = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const videos = [...document.querySelectorAll('video[data-src]')];
  let active;
  const labels = video => {
    const button = video.closest('figure').querySelector('[data-play]');
    button.textContent = !video.paused ? 'Pause animation' : video.ended ? 'Replay animation' : 'Play animation';
  };
  const start = async (video, manual = false) => {
    if (document.hidden || (!manual && (reduced.matches || connection?.saveData || video.dataset.stopped === 'true' || video.dataset.done === 'true'))) return;
    if (active && active !== video) active.pause();
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    if (video.ended) video.currentTime = 0;
    active = video;
    try { await video.play(); } catch { video.dataset.stopped = 'true'; labels(video); }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target;
      video.dataset.visible = String(entry.intersectionRatio >= .5);
      if (entry.intersectionRatio >= .5) start(video); else video.pause();
    }
  }, { threshold: [0, .5, 1] });
  videos.forEach(video => {
    observer.observe(video);
    ['play', 'pause', 'ended'].forEach(type => video.addEventListener(type, () => { if (type === 'ended') video.dataset.done = 'true'; labels(video); }));
    video.addEventListener('error', () => {
      video.dataset.stopped = 'true';
      video.closest('figure').querySelector('[data-media-status]').textContent = 'Animation unavailable. The still and text describe this example.';
      labels(video);
    });
    video.closest('figure').querySelector('[data-play]').addEventListener('click', () => {
      if (!video.paused) { video.dataset.stopped = 'true'; video.pause(); }
      else { video.dataset.stopped = 'false'; video.dataset.done = 'false'; start(video, true); }
    });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach(video => video.pause()); });
  const stopForPreference = () => { if (reduced.matches || connection?.saveData) videos.forEach(video => { video.pause(); video.dataset.stopped = 'true'; }); };
  reduced.addEventListener('change', stopForPreference);
  connection?.addEventListener('change', stopForPreference);
  const dialog = document.querySelector('[data-viewer]');
  let opener;
  document.querySelectorAll('[data-enlarge]').forEach(button => button.addEventListener('click', () => {
    opener = button;
    videos.forEach(video => video.pause());
    const img = dialog.querySelector('img'); img.src = button.dataset.enlarge; img.alt = button.dataset.description;
    dialog.querySelector('[data-viewer-title]').textContent = button.closest('figure').querySelector('.frame-bar > span').textContent;
    dialog.querySelector('[data-viewer-description]').textContent = button.dataset.description;
    dialog.querySelector('.viewer-scroll').classList.remove('zoomed');
    dialog.querySelector('[data-zoom]').setAttribute('aria-pressed', 'false');
    dialog.querySelector('[data-zoom]').textContent = 'Actual size';
    dialog.showModal();
    dialog.querySelector('.viewer-scroll').scrollTo(0, 0);
  }));
  dialog?.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => opener?.focus());
  dialog?.querySelector('[data-zoom]').addEventListener('click', event => {
    const zoom = dialog.querySelector('.viewer-scroll').classList.toggle('zoomed');
    event.target.setAttribute('aria-pressed', String(zoom)); event.target.textContent = zoom ? 'Fit image' : 'Actual size';
  });
  const area = new URLSearchParams(location.search).get('interest');
  const select = document.querySelector('[name="interest"]');
  if (area && select && [...select.options].some(option => option.value === area)) select.value = area;
})();
