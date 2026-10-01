# Breakwater shared logo kit v05

Use this consolidated kit for future website and app integrations. It supersedes
v03 exports and the earlier v04 kit for new asset selection. Creating this kit did
not install it on any website/app or change any production brand-asset pins.

## Three core layouts

| Layout | Light-background SVG | Dark-background SVG | Use |
|---|---|---|---|
| Mark only | `svg/breakwater-mark-red.svg` | Same red mark | Favicon, avatar, app icon |
| Stacked, no tagline | `svg/breakwater-stacked-light.svg` | `svg/breakwater-stacked-dark.svg` | Covers, branding, large placements |
| Stacked, with tagline | `svg/breakwater-stacked-tagline-light.svg` | `svg/breakwater-stacked-tagline-dark.svg` | Large covers, presentations, marketing material |

Also included: horizontal website-header logos (`breakwater-horizontal-light.svg`
and `-dark.svg`), wordmarks, monochrome Vantablack/white versions, and app-icon tiles.
`asset-map.json` provides stable relative paths for integration. `preview.html` is
a self-contained local review page (its images are relative files in this folder).

## Brand and consistency

- Symbol: Breakwater Red **#F0443E**. Light-background lettering: Vantablack **#000100**.
- Dark-background lettering: neutral white **#FFFFFF**.
- All three layouts use the SAME cleaned symbol and wordmark paths from v04.
- The separately supplied mark had a taller silhouette; it is retained as a source
  reference, not introduced as a second app/favicon identity.
- The supplied tagline reads **Security for connected operations**. Its outlines
  were extracted intact, including counters, after vector subtraction of the white
  background. The source's alternative symbol, wordmark and stray pink tracing
  fragment were not adopted. No new font was guessed or substituted.
- Ordinary logo SVGs/PNGs have transparent backgrounds. Only app-icon tiles are
  intentionally opaque, with either a white or Vantablack square background.
- Light/dark/monochrome variants share identical geometry for each layout.

## Files

- `svg/`: 21 true vector variants; no embedded raster images, masks, external fonts
  or filters. Lettering is outlined artwork, not editable font text.
- `png/`: 54 exports. Horizontal 800/1600px; stacked 1024px; stacked with tagline
  1024/2048px; wordmark 800px; symbol 16/32/48/64/128/256/512/1024px; app icons
  180/192/512px. Sizes refer to width; square icons have matching height.
- `webp/`: six lossless horizontal header exports, 340/510/680px in both themes.
- `favicon.ico`: 16, 32 and 48px PNG-backed icon entries.
- `manifest.json`: SVG hashes, source provenance, exact palette and extraction notes.
- `validation.json`: rendering, geometry, transparency and export checks.
- `preview.png`, `preview-mobile.png`: visual review sheets.

For app icons, the symbol is centered inside the central safe circle of each
512px tile. Apple touch icons are available at 180px. No app manifest is changed by
this kit. These are shared brand assets, not a claim that every native platform's
store submission/icon catalog is complete.

## Usage

Use the horizontal no-tagline logo in website/app headers. Use symbol-only for
favicons and small icons. Reserve the tagline layout for sizes where its text is
actually readable; it is not intended for navigation or tiny profile images.
Retain the built-in clear space and aspect ratio. Do not stretch, add shadows,
apply gradients or run background removal again. The small icon retains the shared
symbol; it is not a separately redrawn optical-size logo.

Upload SVGs to Canva for scalable artwork. Validate any round-trip export before
replacing these masters. A saved Canva SVG containing embedded PNGs is not a
replacement for this vector kit.

This is RGB digital artwork. Printer-specific CMYK conversion, trademark clearance
and a new professional typography design are separate work. Original supplied
files are untouched.
