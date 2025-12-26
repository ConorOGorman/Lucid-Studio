# Tokens Added

Add new tokens only when evidenced and record:

- Token name
- Exact value
- Evidence (selector + computed value OR CSS rule source)
- Usage

## 2025-12-23 — Hatamex /en header+hero

- `--color-live: rgb(25, 211, 0)`
  - Evidence: hero “pulse dot” computed background-color `rgb(25, 211, 0)` (Playwright: `docs/forensics/raw/reference-desktop.json` + ad-hoc extraction)
  - Usage: hero status indicator (dot inner)
- `--color-live-alpha: rgba(25, 211, 0, 0.4)`
  - Evidence: hero dot outer computed background-color `rgba(25, 211, 0, 0.4)`
  - Usage: hero status indicator (dot outer)
- `--color-white-20: oklab(0.999994 0.0000455678 0.0000200868 / 0.2)`
  - Evidence: hero rule computed background-color `oklab(... / 0.2)`
  - Usage: hero horizontal rule
- `--border-hairline: 0.5px`
  - Evidence: hero rule computed height `0.5px`
  - Usage: hero horizontal rule height
- `--radius-pill: 33554400px`
  - Evidence: reference `rounded-full` computed border-radius `3.35544e+07px` (Playwright ad-hoc extraction)
  - Usage: round indicators (hero dot)
- Logo and nav sizing tokens (`--logo-*`, `--nav-row-padding-y`, `--nav-logo-gap`, `--hero-rule-*`, `--hero-dot-*`)
  - Evidence: `nav`/hero computed sizes in Playwright (`docs/forensics/raw/reference-*.json` + ad-hoc extraction)
  - Usage: header brand sizing, hero indicator sizing

- Hero lede + CTA + language tokens (`--type-hero-lede`, `--line-height-hero-lede`, `--cta-*`, `--nav-lang-*`, `--nav-cta-*`)
  - Evidence: computed styles for hero CTA buttons and nav language/CTA buttons (Playwright ad-hoc extraction)
  - Usage: match Hatamex hero and header controls

- Rating tokens (`--rating-*`, `--color-white-40`)
  - Evidence: hero rating block DOM+computed sizing (Playwright ad-hoc extraction)
  - Usage: hero rating line (Google icon + 5.0 + stars)

- `--rating-google-icon-w: 14px`, `--rating-google-icon-h: 20px`
  - Evidence: hero rating Google SVG computed size `14×20` (Playwright ad-hoc extraction)
  - Usage: hero rating badge icon
- `--color-google-blue: #4285F4`, `--color-google-green: #34A853`, `--color-google-yellow: #FBBC05`, `--color-google-red: #EA4335`
  - Evidence: hero rating Google SVG path fills (Playwright DOM extraction)
  - Usage: hero rating Google mark

## 2025-12-23 — Hatamex /en text reveal motion

- `--motion-duration-reveal: 900ms`
  - Evidence: line transforms reach final `matrix(..., 0)` ~900ms after motion starts (Playwright time-series capture: `docs/forensics/raw/line-reveal-samples.json`)
  - Usage: line-mask reveal for headings/paragraphs/cards on scroll
- `--motion-delay-reveal: 300ms`
  - Evidence: motion begins ~300–400ms after reveal trigger (Playwright time-series capture: `docs/forensics/raw/line-reveal-samples.json`)
  - Usage: initial delay before line reveal starts
- `--motion-stagger-reveal: 120ms`
  - Evidence: consecutive lines begin moving at ~100–150ms intervals (Playwright time-series capture: `docs/forensics/raw/line-reveal-samples.json`)
  - Usage: per-line stagger in multi-line reveals
