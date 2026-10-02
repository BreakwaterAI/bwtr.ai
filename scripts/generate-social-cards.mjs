// Generates a per-post 1200x630 social card (OG/Twitter image) using the post's
// own cover artwork and title. Uses only approved brand colors/assets.
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const WIDTH = 1200;
const HEIGHT = 630;
const COVER_HEIGHT = 280;
const VANTA = "#000100";
const RED = "#F0443E";
const OFFWHITE = "#F2F1EC";
const MUTED = "#9AA3AD";
const LOGO_MARK = join(root, "blog/assets/brand/breakwater-mark-red-256.png");

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrapText(text, fontSize, maxWidth, charWidthRatio = 0.58) {
  const maxChars = Math.max(6, Math.floor(maxWidth / (fontSize * charWidthRatio)));
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitTitle(title, maxWidth, initialFontSize = 76) {
  let fontSize = initialFontSize;
  let lines = wrapText(title, fontSize, maxWidth);
  while (lines.length > 3 && fontSize > 44) {
    fontSize -= 4;
    lines = wrapText(title, fontSize, maxWidth);
  }
  return { fontSize, lines };
}

export async function generateSocialCard({ title, eyebrow, meta, imagePath, outPath }) {
  const maxWidth = WIDTH - 64 * 2;
  const { fontSize, lines } = fitTitle(title, maxWidth, imagePath ? 58 : 76);
  if (!imagePath) {
    const lineHeight = fontSize * 1.14;
    const blockHeight = lines.length * lineHeight;
    const startY = Math.min(300, (HEIGHT - blockHeight) / 2 + fontSize * 0.75);
    const titleTspans = lines
      .map((line, i) => `<tspan x="64" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${VANTA}"/>
      <rect x="0" y="0" width="${WIDTH}" height="8" fill="${RED}"/>
      <text x="64" y="90" font-family="Menlo, Consolas, monospace" font-size="24" font-weight="700" letter-spacing="2" fill="${RED}">${escapeXml((eyebrow || "BREAKWATER BLOG").toUpperCase())}</text>
      <text font-family="Helvetica, Arial, sans-serif" font-weight="800" fill="${OFFWHITE}" font-size="${fontSize}">${titleTspans}</text>
      ${meta ? `<text x="64" y="${HEIGHT - 52}" font-family="Menlo, Consolas, monospace" font-size="22" fill="${MUTED}">${escapeXml(meta)}</text>` : ""}
    </svg>`;
    const logoSize = 64;
    const logoMargin = 48;
    await sharp(Buffer.from(svg))
      .composite([{
        input: await sharp(LOGO_MARK).resize(logoSize, logoSize).toBuffer(),
        left: WIDTH - logoMargin - logoSize,
        top: HEIGHT - logoMargin - logoSize,
      }])
      .png()
      .toFile(outPath);
    return;
  }
  const lineHeight = fontSize * 1.08;
  const startY = 405;

  const titleTspans = lines
    .map((line, i) => `<tspan x="64" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${VANTA}"/>
    <rect x="0" y="0" width="${WIDTH}" height="8" fill="${RED}"/>
    <rect x="0" y="${COVER_HEIGHT + 8}" width="${WIDTH}" height="3" fill="${RED}"/>
  </svg>`;
  const copySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <text x="64" y="344" font-family="Menlo, Consolas, monospace" font-size="22" font-weight="700" letter-spacing="2" fill="${RED}">${escapeXml((eyebrow || "BREAKWATER BLOG").toUpperCase())}</text>
    <text font-family="Helvetica, Arial, sans-serif" font-weight="800" fill="${OFFWHITE}" font-size="${fontSize}">${titleTspans}</text>
    ${meta ? `<text x="64" y="${HEIGHT - 34}" font-family="Menlo, Consolas, monospace" font-size="20" fill="${MUTED}">${escapeXml(meta)}</text>` : ""}
  </svg>`;

  const logoSize = 64;
  const logoMargin = 48;
  const layers = [];
  if (imagePath) {
    layers.push({
      input: await sharp(imagePath)
        .resize(WIDTH, COVER_HEIGHT, { fit: "cover", position: "attention" })
        .png()
        .toBuffer(),
      left: 0,
      top: 8,
    });
    layers.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${COVER_HEIGHT}"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000100" stop-opacity="0"/><stop offset="1" stop-color="#000100" stop-opacity=".42"/></linearGradient></defs><rect width="${WIDTH}" height="${COVER_HEIGHT}" fill="url(#shade)"/></svg>`),
      left: 0,
      top: 8,
    });
  }
  layers.push({ input: Buffer.from(copySvg), left: 0, top: 0 });
  layers.push({
    input: await sharp(LOGO_MARK).resize(logoSize, logoSize).toBuffer(),
    left: WIDTH - logoMargin - logoSize,
    top: HEIGHT - logoMargin - logoSize,
  });
  await sharp(Buffer.from(baseSvg))
    .composite(layers)
    .png()
    .toFile(outPath);
}
