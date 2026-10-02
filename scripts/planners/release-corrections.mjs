// Narrow promotion of the reviewed product-navigation and image-crop fixes.
// Do not replace whole pages with the separate redesign-preview build.
import assert from 'node:assert/strict';
export function releaseCorrections(file, html) {
  if (file === 'products/index.html') {
    html = html.replaceAll('https://assure.bwtr.ai/console.html', 'https://assure.bwtr.ai/app/login');
    html = html
      .replace(/href="https:\/\/secure\.bwtr\.ai\/" target="_blank" rel="noopener noreferrer">Visit (?:Secure|Discover) website ↗/, 'href="/discover/">Explore Discover →')
      .replace(/href="https:\/\/assure\.bwtr\.ai\/" target="_blank" rel="noopener noreferrer">Visit (?:Assure|Provenance) website ↗/, 'href="/provenance/">Explore Provenance →')
      .replace(/href="https:\/\/soar\.bwtr\.ai\/" target="_blank" rel="noopener noreferrer">Visit (?:SOAR|Response) website ↗/, 'href="/response/">Explore Response →');
  }
  if (file === 'index.html' || file === 'power-utilities/index.html') {
    const source = file === 'index.html' ? '/assets/product-proof/context-substation-400.webp' : '/assets/infrastructure-substation-1200.jpg';
    if (!html.includes(`<span class="context-crop"><img src="${source}"`)) {
      const pattern = new RegExp(`<img src="${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
      assert(pattern.test(html), `${file}: missing substation image`);
      html = html.replace(pattern, image=>`<span class="context-crop">${image}</span>`);
    }
  }
  if (file === 'architecture/index.html' && html.includes('https://asoc.bwtr.ai/architecture')) {
    const old = '<h2>Go deeper into the deployment patterns.</h2><p>Explore the 11-sheet reference across cloud, hybrid, OT, software delivery and regulated environments.</p><a class="text-link" href="https://asoc.bwtr.ai/architecture" target="_blank" rel="noopener noreferrer">Open the full reference architecture ↗</a>';
    assert(html.includes(old), 'Architecture: reviewed replacement changed');
    html = html.replace(old, '<h2>Review the deployment requirements.</h2><p>Discuss the data boundary, connectivity and action controls for your environment with the Breakwater team.</p><a class="text-link" href="/#evaluation">Discuss your architecture →</a>');
  }
  return html;
}
