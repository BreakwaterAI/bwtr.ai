# assets/

This directory is served as-is, but what actually reaches production is an **explicit allowlist**,
not everything that happens to sit in this folder. The allowlist lives in `site-release.json`
(`files`, `media`, `resources`) at the repo root, enforced by `scripts/build-public-site.mjs` and
`scripts/test-site-artifact.mjs`. A file here that isn't in that list is never deployed, no matter
how it got here.

## ASOC v06 production brand assets

- `brand/v06/corporate/` — light and dark corporate header SVGs
- `brand/v06/products/` — light and dark horizontal SVGs with taglines for ASOC, Discover, Provenance and Response
- `brand/v06/icons/` — the Apple touch icon and web favicon

These are also the files pinned in `brand-contract.json`'s `pinnedBrandAssets` and checked by
`scripts/test-production-branding.mjs`. If you're looking for "what logo is the site actually
using in the v06 release candidate," this is the complete production subset.

The website uses the horizontal tagline variants for product identity and the corporate no-tagline
SVG in the shared header. Theme switching selects the supplied light or dark artwork; the SVGs are
served unchanged.

## Complete source kit

The byte-preserved v06 source kit is in `brand-archive/breakwater-logo-kit-v06/`, outside the public
artifact. It contains stacked marks, app icons, PNG exports, review boards and documentation for
website and product-application work. The archive keeps the supplier folder structure and source
filenames, including the older internal version label found in its documentation.

## Old logo artwork

Retired logo exports aren't deleted — they're moved to `brand-archive/` at the repo root (sibling
to this folder, not inside it), which is why it's safe from the deploy allowlist above. See
`brand-archive/README.md`.

## `site-ui/` build artifacts

`site-ui/` holds content-addressed build output (`site.<hash>.js`, `planners.<hash>.css`, etc).
Only the hashes referenced in `site-release.json`'s `resources` are live; older hashes from past
builds are dead weight and safe to delete outright (no archiving needed — they're compiled output,
not source artwork, and `git log` already has them if ever needed).
