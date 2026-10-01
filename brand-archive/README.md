# brand-archive/

Retired brand/logo artwork, kept for reference instead of deleted outright. Nothing here is live —
this directory sits outside `assets/` specifically so it can never match the deploy allowlist in
`site-release.json` / `scripts/build-public-site.mjs`. See `assets/README.md` for what the
production site actually serves.

## `breakwater-logo-kit-v06/`

The complete source kit supplied for the ASOC, Discover, Provenance and Response rebrand. Its
original directory layout and bytes are preserved, except `.DS_Store` files are omitted. The kit's
documentation contains an older internal version label; this wrapper records that the delivered
folder was named `breakwater-logo-kit-v06`.

## `production-v05/`

The corporate header WebP set, touch icon and favicon used by the website before the v06 ASOC
candidate. These files are retained for rollback reference and are outside the deploy allowlist.

## `product-materials-pre-v06/`

The eleven public PDFs and their manifest from the Secure, Assure and SOAR reader pack. They were
removed from public navigation and the release allowlist because their visible branding predates
the ASOC product names. They remain available here as source material for revised briefs.

## `pre-v05-logos/`

Retired 2026-09-30. Two generations of superseded logo artwork:

- `brand-dark-340.webp`, `brand-dark-510.webp`, `brand-light-340.webp`, `brand-light-510.webp` —
  pre-v05 header logo exports, superseded by `assets/product-proof/brand-{light,dark}-v05-*.webp`.
- `breakwater-horizontal-dark.png`, `breakwater-horizontal-dark-transparent.png`,
  `breakwater-horizontal-light.png`, `breakwater-horizontal-light-transparent.png`,
  `breakwater-mark-light.png`, `breakwater-stacked-dark.png`, `breakwater-stacked-light.png` —
  full-resolution pre-webp-pipeline logo PNGs. These stayed pinned in `site-release.json` and
  `brand-contract.json` long after no live page referenced them.

These files were already unreferenced by the live pages before the ASOC rebrand candidate.
