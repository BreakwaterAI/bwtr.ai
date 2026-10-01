#!/usr/bin/env node
// Builds /blog from /blog/posts/*.md — landing page, tag archives, post pages, RSS feed.
// Reuses the site's existing header/footer markup and CSS tokens (brand-contract.json).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { Marked } from "marked";
import markedKatex from "marked-katex-extension";
import hljs from "highlight.js";
import readingTime from "reading-time";
import sharp from "sharp";
import { generateSocialCard } from "./generate-social-cards.mjs";
import { generateHeroImage, WIDTH as HERO_WIDTH, HEIGHT as HERO_HEIGHT } from "./generate-hero-images.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const postsDir = join(root, "blog", "posts");
const outDir = join(root, "blog");
const siteUrl = "https://www.bwtr.ai";
const release = JSON.parse(readFileSync(join(root, "site-release.json"), "utf8"));
const generatedList = join(outDir, ".generated.json");

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");

const marked = new Marked(
  markedKatex({ throwOnError: false }),
);
marked.use({
  renderer: {
    heading(token) {
      const text = this.parser.parseInline(token.tokens);
      const id = slugify(token.text);
      return `<h${token.depth} id="${id}"><a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a>${text}</h${token.depth}>\n`;
    },
    code(token) {
      const { text: code, lang: infostring } = token;
      const lang = (infostring || "").split(/\s+/)[0];
      const validLang = lang && hljs.getLanguage(lang) ? lang : null;
      const highlighted = validLang
        ? hljs.highlight(code, { language: validLang }).value
        : hljs.highlightAuto(code).value;
      return `<pre class="code-block"${validLang ? ` data-lang="${validLang}"` : ""}><code class="hljs">${highlighted}</code></pre>\n`;
    },
  },
});

// ---- load + parse posts ----
if (!existsSync(postsDir)) throw new Error(`Missing ${postsDir}`);
const files = readdirSync(postsDir).filter((f) => f.endsWith(".md"));
const posts = await Promise.all(files.map(async (file) => {
  const raw = readFileSync(join(postsDir, file), "utf8");
  const { data, content } = matter(raw);
  const slug = file.replace(/\.md$/, "");
  const stats = readingTime(content);
  const html = marked.parse(content);
  if (!data.title) throw new Error(`${file}: missing title`);
  if (!data.date) throw new Error(`${file}: missing date`);
  if (!data.excerpt) throw new Error(`${file}: missing excerpt`);

  // A post may point at a real screenshot/animation via `hero:` (relative to
  // blog/assets/); its own aspect ratio is kept so nothing gets cropped.
  // Without one, an abstract hero graphic is generated at build time below.
  let heroUrl, heroWidth, heroHeight;
  if (data.hero) {
    const heroPath = join(outDir, "assets", data.hero);
    if (!existsSync(heroPath)) throw new Error(`${file}: hero not found at blog/assets/${data.hero}`);
    const meta = await sharp(heroPath).metadata();
    heroUrl = `/blog/assets/${data.hero}`;
    heroWidth = meta.width;
    heroHeight = meta.height;
  } else {
    heroUrl = `/blog/${slug}/hero.png`;
    heroWidth = HERO_WIDTH;
    heroHeight = HERO_HEIGHT;
  }

  return {
    slug,
    title: data.title,
    date: data.date,
    author: data.author || "Breakwater Team",
    tags: data.tags || [],
    excerpt: data.excerpt,
    faq: data.faq || [],
    html,
    minutes: Math.max(1, Math.round(stats.minutes)),
    url: `${siteUrl}/blog/${slug}/`,
    heroUrl,
    heroWidth,
    heroHeight,
    hasCustomHero: Boolean(data.hero),
  };
}));
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Related post: whichever other post shares the most tags, tie-broken by recency.
// No shared tags -> no related post; the section is simply omitted, not forced.
for (const post of posts) {
  let best = null;
  let bestShared = 0;
  for (const other of posts) {
    if (other === post) continue;
    const shared = other.tags.filter((t) => post.tags.includes(t)).length;
    if (shared > bestShared) {
      best = other;
      bestShared = shared;
    }
  }
  post.related = bestShared > 0 ? best : null;
}

const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b));
const generatedDirs = [
  ...posts.map((post) => post.slug),
  ...allTags.map((tag) => `tag/${slugify(tag)}`),
];
if (existsSync(generatedList)) {
  const previousDirs = JSON.parse(readFileSync(generatedList, "utf8"));
  for (const directory of previousDirs) {
    if (!/^(?:[\w-]+|tag\/[\w-]+)$/.test(directory) || ["posts", "assets"].includes(directory)) continue;
    if (!generatedDirs.includes(directory)) rmSync(join(outDir, directory), { recursive: true, force: true });
  }
}

const formatDate = (iso) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

// ---- shared chrome (matches current index.html header/footer markup) ----
const head = ({ title, description, canonical, ogImage, ogImageAlt, jsonLd }) => {
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const jsonLdTags = blocks.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join("");
  const imageAlt = ogImageAlt || title;
  return `<!doctype html>
<html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000100"><title>${title}</title><meta name="description" content="${description}"><script src="/${release.resources["theme-init.js"]}"></script><link rel="stylesheet" href="/${release.resources["styles.css"]}"><link rel="stylesheet" href="/blog/assets/katex/katex.min.css"><link rel="stylesheet" href="/blog/blog.css"><script src="/blog/blog.js" defer></script><link rel="canonical" href="${canonical}"><link rel="icon" href="/${release.resources["favicon.webp"]}" type="image/webp"><link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/v06/icons/apple-touch-icon-180.png"><meta property="og:type" content="website"><meta property="og:site_name" content="Breakwater"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ogImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${imageAlt}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${ogImage}"><meta name="twitter:image:alt" content="${imageAlt}"><link rel="alternate" type="application/rss+xml" title="Breakwater Blog" href="/blog/feed.xml">${jsonLdTags}</head>`;
};

const header = (active) => `<body data-theme="light" data-page="blog"><a class="skip" href="#main">Skip to content</a><header class="header"><div class="wrap nav"><a class="brand" href="/" aria-label="Breakwater home"><img data-brand-logo data-theme-logo data-light-src="/assets/brand/v06/corporate/breakwater-horizontal-light.svg" data-dark-src="/assets/brand/v06/corporate/breakwater-horizontal-dark.svg" src="/assets/brand/v06/corporate/breakwater-horizontal-light.svg" width="536" height="152" alt="Breakwater"></a><button class="theme-button" data-theme-toggle aria-label="Dark theme">Dark</button><button class="menu-button" data-menu aria-expanded="false" aria-controls="navigation">Menu</button><nav class="nav-links" id="navigation" aria-label="Main navigation"><details class="product-menu"><summary>Products</summary><div class="product-menu-panel"><a href="/products/"><img class="product-menu-icon" data-theme-logo data-light-src="/assets/brand/v06/product-icons/breakwater-asoc-app-icon-light.svg" data-dark-src="/assets/brand/v06/product-icons/breakwater-asoc-app-icon-dark.svg" src="/assets/brand/v06/product-icons/breakwater-asoc-app-icon-light.svg" width="512" height="512" alt=""><span class="product-menu-copy"><strong>ASOC Platform</strong><span>One connected security platform</span></span></a><a href="/discover/"><img class="product-menu-icon" data-theme-logo data-light-src="/assets/brand/v06/product-icons/breakwater-discover-app-icon-light.svg" data-dark-src="/assets/brand/v06/product-icons/breakwater-discover-app-icon-dark.svg" src="/assets/brand/v06/product-icons/breakwater-discover-app-icon-light.svg" width="512" height="512" alt=""><span class="product-menu-copy"><strong>Discover</strong><span>Assets, attack paths and exposure</span></span></a><a href="/provenance/"><img class="product-menu-icon" data-theme-logo data-light-src="/assets/brand/v06/product-icons/breakwater-provenance-app-icon-light.svg" data-dark-src="/assets/brand/v06/product-icons/breakwater-provenance-app-icon-dark.svg" src="/assets/brand/v06/product-icons/breakwater-provenance-app-icon-light.svg" width="512" height="512" alt=""><span class="product-menu-copy"><strong>Provenance</strong><span>Evidence, validation and provenance</span></span></a><a href="/response/"><img class="product-menu-icon" data-theme-logo data-light-src="/assets/brand/v06/product-icons/breakwater-response-app-icon-light.svg" data-dark-src="/assets/brand/v06/product-icons/breakwater-response-app-icon-dark.svg" src="/assets/brand/v06/product-icons/breakwater-response-app-icon-light.svg" width="512" height="512" alt=""><span class="product-menu-copy"><strong>Response</strong><span>Controlled response and verification</span></span></a></div></details><a href="/#industries">Industries</a><a href="/architecture/">Architecture</a><a href="/blog/"${active === "blog" ? ' aria-current="page"' : ""}>Blog</a><a href="/about/">Company</a><a class="button" href="/#contact">Talk to us<span aria-hidden="true">↗</span></a></nav></div></header><main id="main">`;

const footer = `</main><footer class="footer wrap"><div class="footer-row"><div><strong>Breakwater</strong><p>Security evidence for connected operations.</p></div><nav class="footer-links" aria-label="Footer"><a href="/products/">Products</a><a href="/architecture/">Architecture</a><a href="/blog/">Blog</a><a href="/about/">Company</a><a href="/security/">Security</a><a href="mailto:hello@bwtr.ai">hello@bwtr.ai</a></nav></div><p>© <span data-year>2026</span> Breakwater. All rights reserved.</p></footer></body></html>`;

const faqBlock = (faq) => {
  if (!faq || !faq.length) return "";
  const items = faq
    .map(
      (f, i) =>
        `<details class="faq-item"${i === 0 ? " open" : ""}><summary>${f.q}</summary><p>${f.a}</p></details>`,
    )
    .join("\n");
  return `<section class="post-faq" aria-label="Frequently asked questions"><h2>Questions this raises</h2>${items}</section>`;
};

const relatedBlock = (related) =>
  !related
    ? ""
    : `<section class="post-related" aria-label="Related post"><div class="post-related-label">Related</div><a href="/blog/${related.slug}/">${related.title}</a></section>`;

const faqJsonLd = (faq) =>
  !faq || !faq.length
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      };

const tagPill = (tag, current) =>
  `<a class="tag-pill${current === tag ? " is-active" : ""}" href="/blog/tag/${slugify(tag)}/">${tag}</a>`;

const postCard = (p, { featured = false } = {}) => `<article class="post-card${featured ? " post-card--featured" : ""}">
  <a class="post-card-hero" href="/blog/${p.slug}/" tabindex="-1" aria-hidden="true"><img src="${p.heroUrl}" width="${HERO_WIDTH}" height="${HERO_HEIGHT}" alt="" loading="${featured ? "eager" : "lazy"}"></a>
  <div class="post-card-body">
    <div class="post-card-meta"><time datetime="${p.date}">${formatDate(p.date)}</time><span aria-hidden="true">·</span><span>${p.minutes} min read</span></div>
    <h${featured ? 2 : 3}><a href="/blog/${p.slug}/">${p.title}</a></h${featured ? 2 : 3}>
    <p class="post-card-excerpt">${p.excerpt}</p>
    <div class="post-card-tags">${p.tags.map((t) => tagPill(t)).join("")}</div>
  </div>
</article>`;

// ---- blog/index.html ----
mkdirSync(outDir, { recursive: true });
const [featured, ...rest] = posts;
const landingDescription = "Evidence-led analysis on IoT and OT security, application security, AI-governed response, and post-quantum readiness — from the team building Breakwater.";
await generateSocialCard({
  title: "Evidence, not opinions.",
  eyebrow: "Breakwater Blog",
  meta: "bwtr.ai/blog",
  outPath: join(outDir, "social-card.png"),
});
const landingHtml = `${head({
  title: "Blog | Breakwater",
  description: landingDescription,
  canonical: `${siteUrl}/blog/`,
  ogImage: `${siteUrl}/blog/social-card.png`,
  ogImageAlt: "Breakwater Blog — Evidence, not opinions.",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Breakwater Blog",
    url: `${siteUrl}/blog/`,
    description: landingDescription,
  },
})}${header("blog")}
<section class="wrap section blog-hero"><span class="eyebrow">Breakwater Blog</span><h1>Evidence, not opinions.</h1><p class="lead">Evidence-led analysis on IoT and OT security, application security, AI-governed response, and post-quantum readiness.</p></section>
<section class="wrap section blog-body rule">
  <div class="tag-filter" aria-label="Filter by tag"><span class="tag-filter-label">Browse by topic</span>${allTags.map((t) => tagPill(t)).join("")}</div>
  ${featured ? `<div class="blog-featured">${postCard(featured, { featured: true })}</div>` : ""}
  <div class="post-grid">${rest.map((p) => postCard(p)).join("\n")}</div>
</section>
${footer}`;
writeFileSync(join(outDir, "index.html"), landingHtml);

// ---- blog/<slug>/index.html ----
for (const p of posts) {
  const dir = join(outDir, p.slug);
  mkdirSync(dir, { recursive: true });
  if (!p.hasCustomHero) {
    await generateHeroImage({ title: p.title, tags: p.tags, outPath: join(dir, "hero.png") });
  }
  await generateSocialCard({
    title: p.title,
    eyebrow: p.tags[0] || "Breakwater Blog",
    meta: `${formatDate(p.date)} · ${p.minutes} min read`,
    outPath: join(dir, "social-card.png"),
  });
  const html = `${head({
    title: `${p.title} | Breakwater Blog`,
    description: p.excerpt,
    canonical: p.url,
    ogImage: `${p.url}social-card.png`,
    ogImageAlt: p.title,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: p.title,
        description: p.excerpt,
        datePublished: p.date,
        author: { "@type": "Organization", name: p.author },
        publisher: { "@type": "Organization", name: "Breakwater" },
        mainEntityOfPage: p.url,
      },
      faqJsonLd(p.faq),
    ].filter(Boolean),
  })}${header("blog")}
<article class="wrap section post-article">
  <a class="text-link back-link" href="/blog/">← All posts</a>
  <header class="post-header"><div class="post-card-tags">${p.tags.map((t) => tagPill(t)).join("")}</div><h1>${p.title}</h1><div class="post-card-meta"><span>${p.author}</span><span aria-hidden="true">·</span><time datetime="${p.date}">${formatDate(p.date)}</time><span aria-hidden="true">·</span><span>${p.minutes} min read</span></div></header>
  <div class="post-hero" style="aspect-ratio:${p.heroWidth}/${p.heroHeight}"><img src="${p.heroUrl}" width="${p.heroWidth}" height="${p.heroHeight}" alt="" loading="eager"></div>
  <div class="post-prose">${p.html}</div>
  ${faqBlock(p.faq)}
  ${relatedBlock(p.related)}
  <footer class="post-footer"><a class="text-link" href="/blog/">← All posts</a></footer>
</article>
${footer}`;
  writeFileSync(join(dir, "index.html"), html);
}

// ---- blog/tag/<tag>/index.html ----
for (const tag of allTags) {
  const tagSlug = slugify(tag);
  const dir = join(outDir, "tag", tagSlug);
  mkdirSync(dir, { recursive: true });
  const matches = posts.filter((p) => p.tags.includes(tag));
  await generateSocialCard({
    title: tag,
    eyebrow: "Breakwater Blog — Topic",
    meta: `${matches.length} post${matches.length === 1 ? "" : "s"} · bwtr.ai/blog`,
    outPath: join(dir, "social-card.png"),
  });
  const html = `${head({
    title: `${tag} | Breakwater Blog`,
    description: `Posts tagged ${tag} on the Breakwater blog.`,
    canonical: `${siteUrl}/blog/tag/${tagSlug}/`,
    ogImage: `${siteUrl}/blog/tag/${tagSlug}/social-card.png`,
    ogImageAlt: `${tag} — Breakwater Blog`,
  })}${header("blog")}
<section class="wrap section blog-hero"><a class="text-link back-link" href="/blog/">← All posts</a><span class="eyebrow">Topic</span><h1>${tag}</h1><p class="lead">${matches.length} post${matches.length === 1 ? "" : "s"}.</p></section>
<section class="wrap section blog-body rule"><div class="post-grid">${matches.map((p) => postCard(p)).join("\n")}</div></section>
${footer}`;
  writeFileSync(join(dir, "index.html"), html);
}

// ---- blog/feed.xml (RSS 2.0) ----
const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Breakwater Blog</title>
<link>${siteUrl}/blog/</link>
<description>${escapeXml(landingDescription)}</description>
<language>en-us</language>
${posts.map((p) => `<item><title>${escapeXml(p.title)}</title><link>${p.url}</link><guid>${p.url}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${escapeXml(p.excerpt)}</description></item>`).join("\n")}
</channel></rss>`;
writeFileSync(join(outDir, "feed.xml"), rss);
writeFileSync(generatedList, JSON.stringify(generatedDirs) + "\n");

console.log(`Built ${posts.length} posts, ${allTags.length} tags -> ${outDir}`);
