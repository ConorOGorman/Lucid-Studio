# Lucid Hatamex Homepage Clone (Block Theme)

Pixel-accurate WordPress Block Theme (FSE) clone target: `https://www.hatamex.agency/en` (homepage only).

## Local run (no Docker)

This repo uses WordPress Playground (PHP/WP in WASM) for local rendering:

- Start WP: `npm run wp:serve`
- In another terminal, take build screenshots: `npm run build:screenshots`

## Pixel parity workflow

- Capture reference screenshots (images/videos masked to honor placeholder-only policy): `npm run ref:screenshots`
- Capture build screenshots: `npm run build:screenshots`
- Generate diffs: `npm run diff:home`

Outputs:
- Reference: `docs/reference/home/*.png`
- Build: `docs/build/home/*.png`
- Diffs: `docs/diff/home/*-diff.png`, `docs/diff/home/summary.md`

## Where styling lives

- Tokens (all raw values + breakpoint variable overrides): `wp-content/themes/lucid-hatamex-clone-theme/assets/css/tokens.css`
- Component CSS (variables only): `wp-content/themes/lucid-hatamex-clone-theme/assets/css/main.css`

## Reduced motion

If `prefers-reduced-motion: reduce`:
- Reveal/entrance effects are disabled (static end state).

