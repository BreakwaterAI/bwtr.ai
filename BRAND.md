# Breakwater Website Brand Contract

This file is the human-readable companion to `brand-contract.json`, the machine-readable source of
truth for the public `bwtr.ai` website palette. The palette is locked until the user explicitly
approves different colors.

## Canonical brand colors

| Role | Name | Hex | Required CSS token |
|---|---|---|---|
| Primary canvas | Vantablack (digital approximation) | `#000100` | `--vanta` |
| Primary accent | Breakwater Red | `#F0443E` | `--breakwater-red` |

Breakwater Red is the brighter digital red used by the ASOC Vantablack theme. The former Titian
Earth value `#BD5620` is retired from the active website palette because its copper and golden-brown
undertones read as orange-brown on screen.

## Non-negotiable rules

- Do not replace, reinterpret, or “improve” either canonical hex value without explicit user approval.
- Do not introduce purple, violet, magenta, blue, or another brand accent.
- Do not reintroduce Titian Earth or its brown/orange derivatives as brand colors.
- Do not sample brand colors from photographs, screenshots, or the legacy multicolor logo artwork.
- Use Vantablack and Breakwater Red for site identity. Neutral whites and grays support readability.
- Green and amber are functional status colors only. The test prevents their use for surfaces,
  borders, shadows, or other brand treatments.
- Use Vantablack text on a Breakwater Red button. White on `#F0443E` does not meet WCAG AA for
  ordinary-size text; `#000100` on `#F0443E` does.
- Logo files are pinned source artwork. Do not recolor or redraw them without an approved replacement.

The automated check catches normal palette drift in source and built artifacts: unapproved literal
colors, changes to the canonical tokens, accidental status-color reuse, and modified logo files. It
is a design regression check for trusted maintainers and agents, not a security scanner for
intentionally obfuscated HTML, CSS, or JavaScript. An agent must not weaken the check or expand its
allowlist merely to make a failure disappear. A palette change requires explicit user direction.

## Approved logo replacement, September 21, 2026

The owner approved the v05 horizontal logo in the local website preview and
authorized production publication. The header now uses the canonical symbol in
#F0443E with an outlined #000100 wordmark on light backgrounds, or #FFFFFF on dark
backgrounds. The header has no tagline. The favicon uses the symbol alone; the
Apple touch icon places it on a white tile.

The six responsive header exports, touch icon and content-addressed favicon are
pinned in `brand-contract.json`. Historical artwork pins remain intact for
retained assets and rollback. The palette and color allowlists are unchanged.
The approved shared source is `breakwater-logo-kit-v05`; no image generation,
recoloring of legacy assets, or social-card replacement is part of this release.

## How to test the live site

First use a private/incognito window, or hard-refresh the page:

- Chrome on macOS: `Cmd+Shift+R`
- Chrome on Windows/Linux: `Ctrl+Shift+R`

Then open the browser developer console on `https://www.bwtr.ai/` and run:

```js
getComputedStyle(document.documentElement).getPropertyValue("--vanta").trim()
// expected: #000100

getComputedStyle(document.documentElement).getPropertyValue("--breakwater-red").trim()
// expected: #F0443E
```

For an independent terminal check that follows the content-addressed stylesheet referenced by the
live homepage:

```bash
live_css="$(curl -fsS https://www.bwtr.ai/ | sed -n 's/.*href="\(\/assets\/site-ui\/site\.[0-9a-f]*\.css\)".*/\1/p')"
curl -fsS "https://www.bwtr.ai${live_css}" | grep -E -- '--vanta: #000100|--breakwater-red: #F0443E'
```

The repository checks are:

```bash
node scripts/test-brand-contract.mjs
node scripts/test-positioning.mjs
node scripts/test-rendered-layout.mjs
```
