import { createHash } from "node:crypto";
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const artifact = process.argv[2];
if (!artifact) throw new Error("usage: node scripts/hash-site-assets.mjs ARTIFACT_DIRECTORY");

const revisions = {};
for (const filename of ["styles.css", "script.js"]) {
  const source = join(artifact, filename);
  const content = readFileSync(source);
  const extensionIndex = filename.lastIndexOf(".");
  const stem = filename.slice(0, extensionIndex);
  const extension = filename.slice(extensionIndex);
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const revisioned = `${stem}.${digest}${extension}`;
  copyFileSync(source, join(artifact, revisioned));
  revisions[filename] = revisioned;
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

for (const path of htmlFiles(artifact)) {
  const revised = readFileSync(path, "utf8")
    .replace(/\/styles\.css(?:\?v=[^\"]+)?/g, `/${revisions["styles.css"]}`)
    .replace(/\/script\.js(?:\?v=[^\"]+)?/g, `/${revisions["script.js"]}`);
  writeFileSync(path, revised);
}

writeFileSync(join(artifact, "asset-manifest.json"), `${JSON.stringify(revisions, null, 2)}\n`);
console.log(`Revisioned site assets: ${revisions["styles.css"]}, ${revisions["script.js"]}`);
