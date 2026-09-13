import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const artifact = process.argv[2];
if (!artifact) throw new Error("usage: node scripts/test-site-artifact.mjs ARTIFACT_DIRECTORY");

const manifestPath = join(artifact, "asset-manifest.json");
assert.ok(existsSync(manifestPath), "artifact asset manifest is missing");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

for (const source of ["styles.css", "script.js"]) {
  const sourcePath = join(artifact, source);
  const revisioned = manifest[source];
  assert.ok(revisioned, `${source}: revisioned filename is missing`);
  const extensionIndex = source.lastIndexOf(".");
  const stem = source.slice(0, extensionIndex);
  const extension = source.slice(extensionIndex + 1);
  assert.match(revisioned, new RegExp(`^${stem}\\.[0-9a-f]{12}\\.${extension}$`));
  const expectedDigest = createHash("sha256")
    .update(readFileSync(sourcePath))
    .digest("hex")
    .slice(0, 12);
  assert.ok(revisioned.includes(expectedDigest), `${source}: filename is not content-addressed`);
  assert.deepEqual(readFileSync(join(artifact, revisioned)), readFileSync(sourcePath));
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

for (const htmlPath of htmlFiles(artifact)) {
  const html = readFileSync(htmlPath, "utf8");
  assert.ok(html.includes(`/${manifest["styles.css"]}`), `${htmlPath}: hashed stylesheet missing`);
  assert.ok(html.includes(`/${manifest["script.js"]}`), `${htmlPath}: hashed script missing`);
  assert.ok(!html.includes("/styles.css?v="), `${htmlPath}: query-only stylesheet revision remains`);
  assert.ok(!html.includes("/script.js?v="), `${htmlPath}: query-only script revision remains`);
}

for (const relativePath of [
  "index.html",
  "404.html",
  "architecture/index.html",
  "platform/index.html",
  "products/index.html",
  "research/index.html",
  "about/index.html",
  "security/index.html",
  "airports/index.html",
  "power-utilities/index.html",
  "connected-industry/index.html",
  "healthcare/index.html",
  "sitemap.xml",
  ".well-known/security.txt",
]) {
  assert.ok(existsSync(join(artifact, relativePath)), `artifact is missing ${relativePath}`);
}

console.log("Content-addressed asset and site artifact tests passed.");
