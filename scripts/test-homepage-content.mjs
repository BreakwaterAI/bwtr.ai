import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

const homepage = readFileSync("index.html", "utf8");
const provenance = readFileSync("THIRD-PARTY-ASSETS.md", "utf8");

const requiredCopy = [
  "Security from code to critical infrastructure",
  "Every product shares one evidence and provenance standard.",
  "One evidence chain, start to finish",
  "current and planned capabilities—not a claim that every step is available or connected today",
  "Built around the systems people depend on.",
  "POWER + UTILITIES",
  "AIRPORTS",
  "CONNECTED INDUSTRY",
  "APPLICATION ASSURANCE",
  "CRYPTOGRAPHIC TRANSITION",
  "illustrative environment",
];

for (const text of requiredCopy) {
  assert.ok(homepage.includes(text), `homepage is missing required copy: ${text}`);
}

for (const removedPattern of ["evidence-orbit", "Illustrative interface · no customer or production data"]) {
  assert.ok(!homepage.includes(removedPattern), `homepage retained obsolete content: ${removedPattern}`);
}

const requiredAssets = [
  "assets/infrastructure-substation.jpg",
  "assets/infrastructure-airport.jpg",
  "assets/infrastructure-utility-worker.jpg",
  "assets/infrastructure-hmi.jpg",
  "assets/product-demo-poster.jpg",
];

const licensedPhotos = {
  "assets/infrastructure-substation.jpg": {
    credit: "American Public Power Association",
    source: "https://unsplash.com/photos/gray-metal-power-station-u719UbWj0us",
    sha256: "f685a84885eb9fc14b2482ba3efe9091826ab73269f44b2b59176ec966d7b5fc",
  },
  "assets/infrastructure-airport.jpg": {
    credit: "Nicolas Jehly",
    source: "https://unsplash.com/photos/aerial-photography-of-airport-6WImwokn8dA",
    sha256: "b37a7469aa1d845ddbe0b11f70c0fccca85c6992b94722154bec9882edb42ad8",
  },
  "assets/infrastructure-utility-worker.jpg": {
    credit: "Anton Dmitriev",
    source: "https://unsplash.com/photos/utility-worker-repairing-overhead-power-lines-Q3WVbAfdOoY",
    sha256: "891d08373103254c6e8514cb3a5b3f0913113d249f803474c9f0d195b542ad02",
  },
  "assets/infrastructure-hmi.jpg": {
    credit: "Homa Appliances",
    source: "https://unsplash.com/photos/industrial-manufacturing-machine-control-panel-_XDK4naBbgw",
    sha256: "9e0e1c32bb87124947e433882830614d30243f6dbed5b25560b6a3257a02bc8e",
  },
};

const responsiveAssets = [
  "assets/infrastructure-substation-640.jpg",
  "assets/infrastructure-substation-1200.jpg",
  "assets/infrastructure-airport-640.jpg",
  "assets/infrastructure-airport-1200.jpg",
  "assets/infrastructure-utility-worker-640.jpg",
  "assets/infrastructure-utility-worker-1200.jpg",
  "assets/infrastructure-hmi-640.jpg",
  "assets/infrastructure-hmi-1200.jpg",
];

for (const asset of requiredAssets) {
  assert.ok(existsSync(asset), `required homepage asset is missing: ${asset}`);
  assert.ok(statSync(asset).size > 20_000, `homepage asset is unexpectedly small: ${asset}`);
  assert.ok(homepage.includes(`/${asset}`), `homepage does not reference asset: ${asset}`);
}

for (const asset of responsiveAssets) {
  assert.ok(existsSync(asset), `responsive homepage asset is missing: ${asset}`);
  assert.ok(statSync(asset).size > 10_000, `responsive homepage asset is unexpectedly small: ${asset}`);
  assert.ok(homepage.includes(`/${asset}`), `homepage does not reference responsive asset: ${asset}`);
}

assert.ok(provenance.includes("https://unsplash.com/license"), "Unsplash license link is missing");
for (const [photo, record] of Object.entries(licensedPhotos)) {
  const actualHash = createHash("sha256").update(readFileSync(photo)).digest("hex");
  assert.equal(actualHash, record.sha256, `licensed photo hash changed: ${photo}`);
  for (const evidence of [`\`${photo}\``, record.credit, record.source, `\`${record.sha256}\``]) {
    assert.ok(provenance.includes(evidence), `photo provenance is incomplete for ${photo}: ${evidence}`);
  }
}
assert.ok(
  provenance.includes("`assets/product-demo-poster.jpg` is an existing Breakwater-owned"),
  "first-party product image provenance is missing",
);

const newImageTags = [...homepage.matchAll(/<img\s+[^>]*(?:infrastructure-|product-demo-poster)[^>]*>/g)].map(
  ([tag]) => tag,
);
assert.equal(newImageTags.length, requiredAssets.length, "unexpected number of new homepage image tags");
for (const tag of newImageTags) {
  assert.match(tag, /\salt="[^"]+"/, `image requires descriptive alt text: ${tag}`);
  assert.match(tag, /\swidth="\d+"/, `image requires intrinsic width: ${tag}`);
  assert.match(tag, /\sheight="\d+"/, `image requires intrinsic height: ${tag}`);
  assert.match(tag, /\sdecoding="async"/, `image requires asynchronous decoding: ${tag}`);
}
for (const tag of newImageTags.filter((tag) => tag.includes("infrastructure-"))) {
  assert.match(tag, /\ssrcset="[^"]+"/, `infrastructure image requires responsive sources: ${tag}`);
  assert.match(tag, /\ssizes="[^"]+"/, `infrastructure image requires responsive sizes: ${tag}`);
}

console.log("Homepage content, image, disclosure, and provenance tests passed.");
