import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

const artifactIndex = process.argv.indexOf("--artifact");
const scanRoot = resolve(artifactIndex >= 0 ? process.argv[artifactIndex + 1] : ".");
assert.ok(existsSync(scanRoot), `Brand scan root does not exist: ${scanRoot}`);

const contract = JSON.parse(readFileSync("brand-contract.json", "utf8"));
const brandGuide = readFileSync("BRAND.md", "utf8");
const agentInstructions = readFileSync("AGENTS.md", "utf8");
const canonical = Object.values(contract.canonical);
const approvedHex = new Set(
  Object.values(contract.approvedColors).flat().map((color) => color.toUpperCase()),
);
const functionalHex = new Set(contract.approvedColors.functional.map((color) => color.toUpperCase()));
const approvedRgbTriplets = new Set(contract.approvedRgbTriplets);

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

const textExtensions = new Set([".css", ".html", ".js", ".svg"]);
const textFiles = filesBelow(scanRoot).filter((path) => textExtensions.has(extname(path)));
const cssFiles = textFiles.filter((path) => extname(path) === ".css");
assert.ok(cssFiles.length > 0, `No CSS files found under ${scanRoot}`);

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hexPattern = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-f]|\w)/gi;
const legacyRgbPattern = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+))?\s*\)$/i;
const unsupportedColorFunctions = /(?:^|[^-\w])(?:hsl|hsla|hwb|lab|lch|oklab|oklch|device-cmyk|color)\s*\(/i;
const namedBrandDrift = /(?<![-\w])(?:blue|blueviolet|brown|coral|crimson|fuchsia|magenta|maroon|orange|orangered|orchid|pink|plum|purple|rebeccapurple|red|salmon|tomato|violet)(?![-\w])/i;

function assertApprovedColors(content, path) {
  for (const match of content.matchAll(hexPattern)) {
    assert.ok(approvedHex.has(match[0].toUpperCase()), `${path}: unapproved color ${match[0]}`);
  }
  for (const match of content.matchAll(/rgba?\([^)]*\)/gi)) {
    const parsed = match[0].match(legacyRgbPattern);
    assert.ok(parsed, `${path}: unsupported RGB syntax ${match[0]}`);
    const triplet = `${parsed[1]},${parsed[2]},${parsed[3]}`;
    assert.ok(approvedRgbTriplets.has(triplet), `${path}: unapproved RGB hue rgb(${triplet})`);
  }
  assert.doesNotMatch(content, unsupportedColorFunctions, `${path}: unsupported color function`);
  assert.doesNotMatch(content, namedBrandDrift, `${path}: unapproved named brand color`);
}

function declarationPropertyAt(content, index) {
  const start = Math.max(content.lastIndexOf(";", index), content.lastIndexOf("{", index)) + 1;
  const declaration = content.slice(start, index);
  const separator = declaration.indexOf(":");
  return separator < 0 ? "" : declaration.slice(0, separator).trim();
}

for (const path of textFiles) {
  const content = extname(path) === ".css"
    ? stripCssComments(readFileSync(path, "utf8"))
    : readFileSync(path, "utf8");
  assertApprovedColors(content, path);
}

for (const path of cssFiles) {
  const css = stripCssComments(readFileSync(path, "utf8"));
  const rootBlock = css.match(/^\s*:root\s*\{([\s\S]*?)\}/);
  assert.ok(rootBlock, `${path}: canonical :root brand block must be first`);
  for (const entry of canonical) {
    const property = escapeRegExp(entry.token);
    const definition = rootBlock[1].match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;}]+)`));
    assert.equal(definition?.[1].trim(), entry.value, `${path}: ${entry.token} must equal ${entry.value}`);
  }
  for (const match of css.matchAll(hexPattern)) {
    if (!functionalHex.has(match[0].toUpperCase())) continue;
    assert.match(
      declarationPropertyAt(css, match.index),
      /^--status-(?:success|warning)$/,
      `${path}: functional colors may only define status tokens`,
    );
  }
  for (const match of css.matchAll(/var\(\s*--status-(?:success|warning)\b[^)]*\)/g)) {
    assert.equal(
      declarationPropertyAt(css, match.index),
      "color",
      `${path}: functional status tokens may only set text/icon color`,
    );
  }
}

for (const entry of canonical) {
  const row = `| ${entry.role} | ${entry.name} | \`${entry.value}\` | \`${entry.token}\` |`;
  assert.ok(brandGuide.includes(row), `BRAND.md is missing exact mapping: ${row}`);
  assert.ok(agentInstructions.includes(`\`${entry.value}\``), `AGENTS.md is missing ${entry.value}`);
}

for (const [relativePath, expectedHash] of Object.entries(contract.pinnedBrandAssets)) {
  const path = join(scanRoot, relativePath);
  assert.ok(existsSync(path), `Pinned brand asset is missing: ${path}`);
  const actualHash = createHash("sha256").update(readFileSync(path)).digest("hex");
  assert.equal(actualHash, expectedHash, `${relativePath}: pinned brand asset changed without approval`);
}

console.log(
  `Breakwater palette drift check passed for ${basename(scanRoot)}: ${textFiles.length} text assets and ` +
  `${Object.keys(contract.pinnedBrandAssets).length} pinned brand assets.`,
);
