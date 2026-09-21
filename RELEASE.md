# CISO-led website release

September 21, 2026. Marketing website only: `BreakwaterAI/bwtr.ai`.

## Current revision approval

The owner approved the latest local design, confirmed manual device/Safari/
screen-reader review complete and authorized public use of the supplied clinical
equipment photograph, then confirmed proceeding with the stated technical-check,
main-commit/push and production-deployment sequence. The source-bound approval is
recorded in `release-prep/ciso-publication-approval.json`. These are owner
attestations, not independent manual-review or stock-license verification.

This revision puts IoT/OT security first, makes PQC a discoverable secondary Secure
capability, improves mobile evidence presentation and industry-specific content,
and labels the Architecture diagram and mechanisms as a reference design whose
deployment support must be confirmed with engineering. No shipped-capability
sign-off is implied. Photography uses minimal unlinked Unsplash credit; Healthcare
also states that the photograph does not depict an exposed facility.

Existing product-media approval and the verified lead endpoint are retained.
No further real inquiry is authorized or needed for this unchanged endpoint;
release form checks intercept submissions. Current local design review stays on
port 4179; the existing release verification port 4177 is not changed.

Pre-push validation passed on the exact 97-file public artifact: 125 browser/form
checks, 30 cold-cache budget cases, 12 intercepted submissions and zero real
submissions. Brand, canonical metadata, approved copy, offline lead handling,
deployment-target guards, exact artifact hashes, publisher failure/rollback tests
and legacy/product-led/CISO-led snapshot validation all passed. Both existing
video files matched their approved hashes, MIME types and HTTP byte-range behavior.
The approval record pins the public manifest hash. Production builds use the
committed HTML and assets directly; local prototype sources, reports and review
evidence are not packaged or swept into this release commit.

## Approved scope

The owner approved public use of the product screenshots (including downloadable
originals), posters and two short demo clips; confirmed manual Safari/device/
screen-reader review complete; and authorized publication and main-branch commit
subject to technical checks. The release includes ten content pages, the 404 page,
the platform-to-architecture fallback, the production footer, and the replacement
lead endpoint. Product applications, DNS, AWS infrastructure and old leads are not
changed. Vantablack #000100 and Breakwater Red #F0443E remain locked by BRAND.md.

## Reproducible public artifact

`site-release.json` records the exact 97 public source files and their hashes,
five content-addressed UI resources, canonical/social metadata, endpoint and media
inventory. It is source-only. The build adds only the public asset manifest.
No planning documents, test evidence, source scripts, or local review banners ship.

```sh
npm ci
npx playwright install chromium
npm test
bash scripts/build-site-artifact.sh /tmp/bwtr-NEW-release/site
node scripts/test-site-artifact.mjs /tmp/bwtr-NEW-release/site
node scripts/test-brand-contract.mjs --artifact /tmp/bwtr-NEW-release/site
BWTR_ARTIFACT=/tmp/bwtr-NEW-release/site npm run test:browser
node scripts/verify-release-media.mjs https://www.bwtr.ai
```

Use a fresh artifact directory. Build needs only this checkout and Node, not local
Downloads, private product repositories, image conversion tools or preview files.
Browser checks fulfill pages from disk and intercept all form POSTs. Their only
external reads are the hash-verified approved clips. Layouts cover five widths and
two themes; cold-context byte budgets include all response bodies and branding.
The fixed development port remains 4177.

When changing public content, update the reviewed file's hash and byte size in
`site-release.json`. When changing a UI resource, rename it with its SHA-256 first
12 characters and update every reference and manifest entry. Do not change brand
allowlists or pinned logo artwork to make tests pass. The previous root CSS/JS and
asset-hashing script are historical sources; production uses `assets/site-ui/`.

## Leads verification

The new sheet is owned by `nagu@bwtr.ai`. The Apps Script template is under
`google-apps-script/org-owned/`, with explicit spreadsheet configuration, field
validation, locking and formula escaping. The new anonymous endpoint was verified
by an authorized direct POST and exact row readback. A separately authorized single
browser inquiry was received in row 4 on September 20 at 12:20:18 UTC, matching the
test marker, name, email, organization, PQC context, message and source URL.
The timestamp was generated server-side. No existing rows were edited or deleted.
The browser does not supply the optional user_agent field. The deployment owner's
identity is user-configured, not independently exposed by the Drive connector.
Further real test inquiries require specific permission.

## Media and deployment

Approved `secure-route.mp4` (129,613 bytes) and `soar-review.mp4` (731,388 bytes)
are S3-only at `assets/videos/redesign/`. Their SHA-256 values are in the inventory.
They were provisioned conditionally (no overwrite), with video/mp4 and one-hour
public cache headers, and checked for full hash/length and HTTP 206 byte ranges.
All existing S3 videos remain excluded from regular publication and rollback.

Main deploys through GitHub OIDC to account `506126099258`, bucket
`bwtr-ai-site-prod-506126099258`, CloudFront `E173Y881SRDFT0`.
Local AWS commands must explicitly use `breakwater-prod`. The pipeline verifies
account, distribution and canonical routing before mutation, snapshots the old
site, validates its hashed dependencies, uploads dependencies before documents and
the homepage last, invalidates CloudFront and checks exact public document/UI bytes
and cache headers. Failures restore the snapshot and invalidate again. Both legacy
and redesigned snapshots are supported. No deletion or infrastructure mutation.

Retain the pre-release snapshot and superseded objects through the soak period.
Review Actions results and live apex/www, ten routes, platform redirect, unknown
route 404, social images, media and footer after deployment. Never infer successful
publication from a pushed commit alone.
