// Narrow promotion of the reviewed product-navigation and image-crop fixes.
// Do not replace whole pages with the separate redesign-preview build.
import assert from 'node:assert/strict';
export function releaseCorrections(file, html) {
  if (file === 'products/index.html') {
    html = html.replaceAll('https://assure.bwtr.ai/console.html', 'https://assure.bwtr.ai/app/login');
    for (const [name, marker] of [
      ['Secure', 'Talk to us<span aria-hidden="true">↗</span></a></div></div><figure'],
      ['Assure', 'Identify the components that need source-level review.</p></div><figure'],
      ['SOAR', 'Inspect the proposed response.</h2></div><figure'],
    ]) {
      const slug = name.toLowerCase();
      if (html.includes(`class="text-link product-site-link" href="https://${slug}.bwtr.ai/"`)) continue;
      assert(html.includes(marker), `${name}: reviewed insertion point changed`);
      const link = `<a class="text-link product-site-link" href="https://${slug}.bwtr.ai/" target="_blank" rel="noopener noreferrer">Visit ${name} website ↗</a>`;
      const anchor = name === 'Secure' ? '</a>' : name === 'Assure' ? '</p>' : '</h2>';
      html = html.replace(marker, marker.replace(anchor, anchor + link));
    }
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
    html = html.replace(old, '<h2>Review the deployment requirements.</h2><p>Discuss the data boundary, connectivity and action controls for your environment with the Breakwater team.</p><a class="text-link" href="/#contact">Discuss your architecture →</a>');
  }
  return html;
}
