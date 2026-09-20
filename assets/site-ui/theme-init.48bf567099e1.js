// Runs before styles are painted. Storage may be unavailable in private or
// restricted contexts; the documented first-visit default remains light.
try {
  document.documentElement.dataset.theme = localStorage.getItem('breakwater-theme') === 'dark' ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}
