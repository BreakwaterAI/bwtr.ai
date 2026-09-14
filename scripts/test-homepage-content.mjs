import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

const homepage = readFileSync("index.html", "utf8");
const provenance = readFileSync("THIRD-PARTY-ASSETS.md", "utf8");
const stylesheet = readFileSync("styles.css", "utf8");

const requiredCopy = [
  "Security from code to critical infrastructure",
  "Know what is exposed. Prove what matters.",
  "Your tools find signals. Your team still has to defend the decision.",
  "One evidence-to-action system. Three operational modules.",
  "Govern authorized response",
  "Category-level positioning only. This is not a vendor benchmark or performance claim.",
  "One evidence chain, start to finish",
  "current and planned capabilities. It is not a claim that every step is available or connected today",
  "Built around the systems people depend on.",
  "Designed to operate inside the customer’s boundary.",
  "POWER + UTILITIES",
  "AVIATION",
  "HEALTHCARE",
  '<small class="photo-credit">Photo: Unsplash</small>',
  "CONNECTED INDUSTRY",
  "Breakwater Assure",
  "Breakwater Secure",
  "Breakwater SOAR",
  "illustrative environment",
];

for (const text of requiredCopy) {
  assert.ok(homepage.includes(text), `homepage is missing required copy: ${text}`);
}

for (const removedPattern of [
  "evidence-orbit",
  "Illustrative interface · no customer or production data",
  'class="product-card product-asoc"',
  "Four products",
]) {
  assert.ok(!homepage.includes(removedPattern), `homepage retained obsolete content: ${removedPattern}`);
}

assert.ok(
  !homepage.includes('href="https://unsplash.com/photos/'),
  "visible photo credits must not create outbound Unsplash links",
);
assert.equal(
  [...homepage.matchAll(/class="photo-credit"/g)].length,
  5,
  "every infrastructure photograph requires a plain-text credit",
);

assert.match(
  stylesheet,
  /\.hero \{[^}]*width: 100%/,
  "homepage hero must remain full width",
);
assert.match(
  stylesheet,
  /\.hero-backdrop img \{[^}]*object-fit: cover[^}]*width: 100%/,
  "hero photograph must fill the full-width canvas",
);
assert.match(
  stylesheet,
  /\.environment-story \.photo-credit \{[^}]*background: rgba\(5,5,5,\.92\)[^}]*color: #fff/,
  "photo credits require an opaque high-contrast treatment",
);
assert.match(
  stylesheet,
  /@media \(max-width: 900px\) \{\s*\.environment-gallery \{ grid-template-columns: 1fr; \}/,
  "environment cards require a readable tablet layout",
);

const requiredAssets = [
  "assets/breakwater-hero-airport.jpg",
  "assets/infrastructure-airport.jpg",
  "assets/infrastructure-healthcare.jpg",
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
  "assets/breakwater-hero-airport-640.jpg",
  "assets/breakwater-hero-airport-1200.jpg",
  "assets/infrastructure-airport-640.jpg",
  "assets/infrastructure-airport-1200.jpg",
  "assets/infrastructure-healthcare-640.jpg",
  "assets/infrastructure-healthcare-1200.jpg",
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
function jpegDimensions(path) {
  const jpeg = readFileSync(path);
  assert.equal(jpeg.readUInt16BE(0), 0xffd8, `${path} is not a JPEG`);
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset < jpeg.length) {
    while (jpeg[offset] === 0xff) offset += 1;
    const marker = jpeg[offset];
    offset += 1;
    if (startOfFrame.has(marker)) {
      return { height: jpeg.readUInt16BE(offset + 3), width: jpeg.readUInt16BE(offset + 5) };
    }
    if (marker === 0xd9 || marker === 0xda) break;
    offset += jpeg.readUInt16BE(offset);
  }
  throw new Error(`could not read JPEG dimensions: ${path}`);
}

const heroAssets = {
  "assets/breakwater-hero-airport.jpg": {
    dimensions: { width: 2000, height: 1335 },
    maxBytes: 620_000,
    sha256: "2c815b05f61a2e4f9d65a8dcbda231d76c39c8f8919e34110c27e2709e9247e5",
  },
  "assets/breakwater-hero-airport-1200.jpg": {
    dimensions: { width: 1200, height: 801 },
    maxBytes: 270_000,
    sha256: "bdb346e03bf75be74cfcf7afbf018ef32bc8ad94204b6a29a0412c1da60d1829",
  },
  "assets/breakwater-hero-airport-640.jpg": {
    dimensions: { width: 640, height: 427 },
    maxBytes: 80_000,
    sha256: "205dc0f08a9467a908a1a9b942c0f5bdaab805603ba15c74469d821d1e65c34a",
  },
};
for (const [photo, contract] of Object.entries(heroAssets)) {
  assert.deepEqual(jpegDimensions(photo), contract.dimensions, `hero dimensions changed: ${photo}`);
  assert.ok(statSync(photo).size <= contract.maxBytes, `hero asset exceeds byte budget: ${photo}`);
  const actualHash = createHash("sha256").update(readFileSync(photo)).digest("hex");
  assert.equal(actualHash, contract.sha256, `hero asset changed: ${photo}`);
  assert.ok(provenance.includes(`\`${contract.sha256}\``), `hero hash missing: ${photo}`);
}
for (const evidence of [
  "`breakwater-hero-image-01 2.jpeg`",
  "`d7e896d3317a084a29465a0843b5724e5d99ca57da738b1a2b69c3ad09047730`",
  "site owner's marketing records",
]) {
  assert.ok(provenance.includes(evidence), `hero provenance is incomplete: ${evidence}`);
}

const healthcareAssets = {
  "assets/infrastructure-healthcare.jpg": {
    dimensions: { width: 1500, height: 1000 },
    maxBytes: 200_000,
    sha256: "f855291bdb262f8a1f2254572ebce67b8a2fc4d10a2863d9f288de3e8306ef04",
  },
  "assets/infrastructure-healthcare-1200.jpg": {
    dimensions: { width: 1200, height: 800 },
    maxBytes: 180_000,
    sha256: "d66b24a61bef5fc79d672812bf3a0d3ce0c1d35ff76155c748748faab3b55e77",
  },
  "assets/infrastructure-healthcare-640.jpg": {
    dimensions: { width: 640, height: 426 },
    maxBytes: 60_000,
    sha256: "2450b8afa8b7d9c66d65f1342b915e5064ef7aa67d0e3da8d1a763002594885b",
  },
};
for (const [photo, contract] of Object.entries(healthcareAssets)) {
  assert.deepEqual(jpegDimensions(photo), contract.dimensions, `healthcare dimensions changed: ${photo}`);
  assert.ok(statSync(photo).size <= contract.maxBytes, `healthcare asset exceeds byte budget: ${photo}`);
  const actualHash = createHash("sha256").update(readFileSync(photo)).digest("hex");
  assert.equal(actualHash, contract.sha256, `licensed healthcare asset changed: ${photo}`);
  assert.ok(provenance.includes(`\`${contract.sha256}\``), `healthcare hash missing: ${photo}`);
}
for (const evidence of [
  "https://unsplash.com/plus/license",
  "`assets/infrastructure-healthcare.jpg`",
  "`hospital-cctv-02.jpg`",
  "states that it is illustrative",
]) {
  assert.ok(provenance.includes(evidence), `healthcare photo provenance is incomplete: ${evidence}`);
}
assert.ok(
  provenance.includes("`assets/product-demo-poster.jpg` is an existing Breakwater-owned"),
  "first-party product image provenance is missing",
);

const newImageTags = [...homepage.matchAll(/<img\s+[^>]*(?:breakwater-hero-airport|infrastructure-|product-demo-poster)[^>]*>/g)].map(
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
const healthcareTag = newImageTags.find((tag) => tag.includes("infrastructure-healthcare.jpg"));
assert.match(healthcareTag, /\sloading="lazy"/, "healthcare image must remain lazy-loaded");
assert.match(healthcareTag, /\swidth="1500"\sheight="1000"/, "healthcare intrinsic dimensions changed");
assert.ok(
  healthcareTag.includes('(max-width: 900px) calc(100vw - 64px)'),
  "healthcare sizes hint must match the tablet layout",
);
assert.ok(
  homepage.indexOf("breakwater-hero-airport.jpg") < homepage.indexOf("infrastructure-airport.jpg") &&
    homepage.indexOf("infrastructure-airport.jpg") < homepage.indexOf("infrastructure-healthcare.jpg"),
  "full-width hero and prominent airport environment hierarchy changed",
);
const heroTag = newImageTags.find((tag) => tag.includes("breakwater-hero-airport.jpg"));
assert.match(heroTag, /\sfetchpriority="high"/, "hero image must retain high fetch priority");
assert.match(heroTag, /\ssizes="100vw"/, "full-width hero requires a 100vw sizes hint");
assert.ok(!heroTag.includes('loading="lazy"'), "above-the-fold hero must not be lazy-loaded");

console.log("Homepage content, image, disclosure, and provenance tests passed.");
