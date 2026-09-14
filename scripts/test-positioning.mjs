import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const homepage = readFileSync("index.html", "utf8");
const products = readFileSync("products/index.html", "utf8");
const architecture = readFileSync("architecture/index.html", "utf8");
const legacyPlatform = readFileSync("platform/index.html", "utf8");
const script = readFileSync("script.js", "utf8");
const styles = readFileSync("styles.css", "utf8");

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

assert.ok(styles.includes("--vanta: #000100;"), "Vantablack brand token is missing");
assert.ok(styles.includes("--titian: #BD5620;"), "Titian earth brand token is missing");
assert.ok(
  !/purple|violet|magenta/i.test(styles),
  "Legacy purple-family brand tokens must not return to the site stylesheet",
);
for (const legacyColor of [
  "#050505",
  "#c45c3e",
  "#6631d5",
  "#6d35d4",
  "#7847e8",
  "#8f51ff",
  "#914cff",
  "#a76bff",
  "#af68ff",
  "#b268ff",
  "#bd2d7d",
  "#e348a5",
  "#f17ba6",
  "#ff5b82",
  "#ff5f80",
]) {
  assert.ok(!styles.toLowerCase().includes(legacyColor), `Legacy purple color remains: ${legacyColor}`);
}
assert.ok(contrast("#C55F27", "#000100") >= 4.5, "Accessible Titian text must pass AA on Vantablack");
assert.ok(contrast("#9B4012", "#f7f4ef") >= 4.5, "Light-theme Titian text must pass AA");
for (const buttonStop of ["#78300D", "#84350F", "#BD5620"]) {
  assert.ok(contrast("#ffffff", buttonStop) >= 4.5, `CTA stop ${buttonStop} must pass AA`);
}
for (const [token, value] of [
  ["--button-deep", "#78300D"],
  ["--button-main", "var(--titian-deep)"],
  ["--button-bright", "var(--titian)"],
]) {
  assert.ok(styles.includes(`${token}: ${value};`), `${token} is disconnected from its tested value`);
}
assert.ok(
  /\.button-primary \{[^}]*var\(--button-deep\)[^}]*var\(--button-main\)[^}]*var\(--button-bright\)/.test(styles),
  "Primary CTA must use the contrast-tested gradient tokens",
);
assert.ok(
  contrast("#9B4012", "#f1ebe2") >= 3,
  "Light-theme focus ring must have 3:1 contrast against controls",
);
assert.ok(
  styles.includes(':focus-visible { box-shadow: 0 0 0 2px #000100 !important; outline: 3px solid #fff !important;'),
  "Focus indicators must use a two-tone ring that survives light and fixed-dark surfaces",
);
assert.ok(
  styles.includes(".hero h1 em, .page-hero-visual h1 em { color: var(--titian-bright); }"),
  "Photographic hero emphasis must remain bright in both themes",
);
assert.ok(!styles.includes(".healthcare-hero.page-hero-visual::before"), "Healthcare hero must retain the safe dark overlay");
assert.ok(
  styles.includes(".product-name { color: var(--titian-text);"),
  "Small product labels must use the accessible theme-aware Titian token",
);

const publicHtmlFiles = ["index.html", "404.html"];
for (const entry of readdirSync(".", { withFileTypes: true })) {
  if (entry.isDirectory()) {
    try {
      readFileSync(`${entry.name}/index.html`, "utf8");
      publicHtmlFiles.push(`${entry.name}/index.html`);
    } catch {
      // Directories without a public index page are not part of the marketing site.
    }
  }
}
for (const relativePath of publicHtmlFiles) {
  const html = readFileSync(relativePath, "utf8");
  assert.ok(!html.includes("asoc.bwtr.ai"), `${relativePath}: temporary ASOC demo host remains`);
  assert.ok(
    html.includes('<meta name="theme-color" content="#000100"'),
    `${relativePath}: browser theme color must match the near-black site canvas`,
  );
}

for (const [page, html] of [
  ["homepage", homepage],
  ["products", products],
  ["architecture", architecture],
]) {
  assert.ok(html.includes('href="/architecture/"'), `${page}: Architecture navigation is missing`);
  assert.ok(html.includes('href="/#decisions"') || page === "homepage", `${page}: Why Breakwater navigation is missing`);
  assert.ok(!html.includes('href="/platform/"'), `${page}: legacy Platform URL remains`);
}

assert.ok(homepage.includes("Breakwater ASOC is the operating architecture"));
assert.ok(homepage.includes("Secure observes, Assure validates, and SOAR governs response"));
assert.ok(homepage.includes("They are our research and learning environment, not another operating module in ASOC."));
assert.ok(!homepage.includes("Govern every response"));
assert.ok(!readFileSync("about/index.html", "utf8").includes("inside customer teams"));
assert.ok(!readFileSync("research/index.html", "utf8").includes("used by students"));

assert.ok(products.includes("Breakwater ASOC is the system. Secure, Assure, and SOAR own the work."));
assert.equal(
  [...products.matchAll(/class="product-detail detail-/g)].length,
  3,
  "Products page must contain exactly three ASOC operating-module detail records",
);
assert.ok(!products.includes("detail-asoc"), "ASOC must not appear as a peer product module");
assert.ok(!products.includes("detail-mcp"), "MCP must remain research and enablement, not an ASOC module");
assert.ok(products.includes("MCP is where teams explore the methods behind the operating system."));
assert.ok(products.includes('href="https://assure.bwtr.ai/console.html"'));
assert.ok(!products.includes('href="https://assure.bwtr.ai/app"'));
const productAccessMap = {
  "Breakwater Secure": {
    site: "https://secure.bwtr.ai/",
    console: "https://secure.bwtr.ai/app",
  },
  "Breakwater Assure": {
    site: "https://assure.bwtr.ai/",
    console: "https://assure.bwtr.ai/console.html",
  },
  "Breakwater SOAR": {
    site: "https://soar.bwtr.ai/",
    console: "https://soar.bwtr.ai/app",
  },
};
const productAccessCards = [...products.matchAll(/<article class="access-card">[\s\S]*?<\/article>/g)].map(
  ([card]) => card,
);
assert.equal(productAccessCards.length, 3, "Product access must contain exactly three module cards");
for (const [product, routes] of Object.entries(productAccessMap)) {
  const card = productAccessCards.find((candidate) =>
    candidate.includes(`<span>${product.toUpperCase()}</span>`),
  );
  assert.ok(card, `${product}: access card is missing`);
  assert.notEqual(routes.site, routes.console, `${product}: product and console URLs must differ`);
  assert.ok(card.includes(`href="${routes.site}"`), `${product}: product site link is incorrect`);
  assert.ok(card.includes(`href="${routes.console}"`), `${product}: console link is incorrect`);
  assert.equal(
    [...card.matchAll(/href="https:\/\/[^\"]+"/g)].length,
    2,
    `${product}: access card must contain only its product-site and console routes`,
  );
}
assert.ok(
  products.includes("Consoles are authenticated operating surfaces"),
  "Product access must explain the console authentication boundary",
);
assert.equal(
  [...products.matchAll(/>View product site <b>↗<\/b><\/a>/g)].length,
  3,
  "Each module must distinguish its product site from its console",
);
assert.equal(
  [...products.matchAll(/>Open console <b>↗<\/b><\/a>/g)].length,
  3,
  "Each module console must be listed",
);
assert.ok(products.includes('<table class="comparison-table reveal">'));
assert.ok(products.includes('<th scope="col">Primary question</th>'));
assert.ok(products.includes('<th scope="row">Breakwater Secure</th>'));
assert.ok(products.includes('aria-current="page" href="/products/"'));
assert.ok(homepage.includes('<table class="category-table reveal">'));
assert.ok(homepage.includes('<th scope="col">Decision gap Breakwater addresses</th>'));
assert.ok(architecture.includes('aria-current="page" href="/architecture/"'));
assert.ok(script.includes("window.innerWidth > 1040"), "JavaScript menu breakpoint must match CSS");
assert.ok(!script.includes("window.innerWidth > 760"), "stale tablet menu breakpoint remains");

for (const [page, html] of [
  ["products", products],
  ["architecture", architecture],
]) {
  for (const socialMetadata of [
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'property="og:image:alt"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"',
  ]) {
    assert.ok(html.includes(socialMetadata), `${page}: social metadata is missing: ${socialMetadata}`);
  }
}

for (const statement of [
  "CUSTOMER-CONTROLLED DECISION BOUNDARY",
  "ACTION BOUNDARY",
  "Nothing consequential by implication.",
  "not a claim that every connector or action is available in every installation",
  "Category-level positioning only. This is not a vendor benchmark or performance claim.",
  "CUSTOMER-CONTROLLED EVIDENCE LAYER",
  "ASOC CONTROL PLANE · AGREED PLACEMENT",
  "Local evidence vault",
  "AIRPORTS + TRANSPORTATION",
  "POWER + UTILITIES",
  "CONNECTED INDUSTRY",
  "OT / IoT asset visibility",
  "PQC inventory + migration",
]) {
  assert.ok(architecture.includes(statement), `Architecture page is missing boundary statement: ${statement}`);
}
assert.ok(!architecture.includes('role="img"'), "Architecture descendants must remain available to assistive technology");
assert.ok(architecture.includes("This executive view shows logical control and decision authority, not physical hosting."));
assert.ok(architecture.includes("Customer-hosted, Breakwater-hosted, or approved hybrid"));
for (const anchor of ["reference-model", "technical-architecture", "category-positioning"]) {
  assert.ok(architecture.includes(`id="${anchor}"`), `Architecture section is missing: #${anchor}`);
}
for (const secondaryPage of [
  ["products", products],
  ["architecture", architecture],
  ["research", readFileSync("research/index.html", "utf8")],
  ["about", readFileSync("about/index.html", "utf8")],
]) {
  assert.ok(
    secondaryPage[1].includes("page-hero-visual") && secondaryPage[1].includes("page-hero-backdrop"),
    `${secondaryPage[0]}: real-image page hero is missing`,
  );
}
for (const readabilityRule of [
  "h1 { font-size: clamp(3.15rem, 6.2vw, 6.4rem)",
  ".eyebrow { align-items: center; color: var(--muted); display: flex; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.75rem",
  ".page-hero h1 { font-size: clamp(3.4rem, 5.8vw, 5.9rem)",
]) {
  assert.ok(styles.includes(readabilityRule), `Typography balance rule is missing: ${readabilityRule}`);
}

assert.ok(legacyPlatform.includes('content="0; url=/architecture/"'));
assert.ok(legacyPlatform.includes('rel="canonical" href="https://www.bwtr.ai/architecture/"'));
assert.ok(legacyPlatform.includes('window.location.replace("/architecture/"'));

console.log("CISO positioning, product hierarchy, and architecture boundary tests passed.");
