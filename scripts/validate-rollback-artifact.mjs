import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const rollbackArtifact = process.argv[2];
if (!rollbackArtifact) {
  throw new Error("usage: node scripts/validate-rollback-artifact.mjs ROLLBACK_DIRECTORY");
}

const architecturePath = join(rollbackArtifact, "architecture", "index.html");
assert.ok(existsSync(architecturePath), "rollback snapshot is missing architecture/index.html");
const architecture = readFileSync(architecturePath, "utf8");
assert.ok(
  architecture.includes("CUSTOMER-CONTROLLED DECISION BOUNDARY") || architecture.includes('Know what connects.') || architecture.includes('How Breakwater connects to your environment.'),
  "rollback Architecture page is missing its release marker",
);

const dependencies = [...architecture.matchAll(/(?:src|href)="\/((?:assets\/site-ui\/)?[\w-]+\.([0-9a-f]{12})\.(?:css|js|webp))"/g)];
assert.ok(dependencies.some(m => m[1].endsWith('.css')), 'rollback stylesheet is not hashed');
assert.ok(dependencies.some(m => m[1].endsWith('.js')), 'rollback script is not hashed');
for (const match of dependencies) {
  const relativePath = match[1];
  const dependencyPath = join(rollbackArtifact, relativePath);
  assert.ok(existsSync(dependencyPath), `rollback snapshot is missing ${relativePath}`);
  const digest = createHash("sha256").update(readFileSync(dependencyPath)).digest("hex").slice(0, 12);
  assert.equal(digest, match[2], `${relativePath}: filename does not match its content hash`);
}

console.log("Rollback snapshot contains a working Architecture destination and dependencies.");
