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
  architecture.includes("CUSTOMER-CONTROLLED DECISION BOUNDARY"),
  "rollback Architecture page is missing its release marker",
);

for (const [stem, extension] of [
  ["styles", "css"],
  ["script", "js"],
]) {
  const match = architecture.match(new RegExp(`/${stem}\\.([0-9a-f]{12})\\.${extension}`));
  assert.ok(match, `rollback Architecture page does not reference a hashed ${stem} asset`);
  const relativePath = match[0].slice(1);
  const dependencyPath = join(rollbackArtifact, relativePath);
  assert.ok(existsSync(dependencyPath), `rollback snapshot is missing ${relativePath}`);
  const digest = createHash("sha256").update(readFileSync(dependencyPath)).digest("hex").slice(0, 12);
  assert.equal(digest, match[1], `${relativePath}: filename does not match its content hash`);
}

console.log("Rollback snapshot contains a working Architecture destination and dependencies.");
