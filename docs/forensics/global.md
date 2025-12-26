# Global Forensics (Hatamex /en)

Evidence sources:
- Live computed styles via Playwright on https://www.hatamex.agency/en
- Loaded stylesheets: https://www.hatamex.agency/_next/static/chunks/23679094b9cd398d.css, https://www.hatamex.agency/_next/static/chunks/9e31d20932476e36.css

## Token Inventory (extracted)

| Token | Value | Evidence |
|---|---|---|
| --color-accent | #1718fe | :root computed var |
| --color-background | #fff | :root computed var |
| --color-container | #f4f4f4 | :root computed var |
| --color-nav-darker-container | #212121 | :root computed var |
| --color-gray-text | #878787 | :root computed var |
| --color-gray-text-2 | #4e4e4e | :root computed var |
| --color-nav-text | #101828 | :root computed var |
| --color-gray-border | #c8c8c8 | :root computed var |
| --default-transition-duration | .15s | :root computed var |
| --default-transition-timing-function | cubic-bezier(.4,0,.2,1) | :root computed var |

## Container / Grid (desktop snapshot)

- Nav container padding-left/right:
  - 1440×900: 64px / 64px (docs/forensics/raw/reference-desktop.json nav.container)
  - 1280×800: 64px / 64px (docs/forensics/raw/reference-laptop.json nav.container)
  - 834×1112: 12px / 12px (docs/forensics/raw/reference-tablet.json nav.container)
  - 390×844: 12px / 12px (docs/forensics/raw/reference-mobile.json nav.container)
- Nav height:
  - 1440×900: 92px (docs/forensics/raw/reference-desktop.json nav.navRect)
  - 1280×800: 92px (docs/forensics/raw/reference-laptop.json nav.navRect)
  - 834×1112: 77px (docs/forensics/raw/reference-tablet.json nav.navRect)
  - 390×844: 77px (docs/forensics/raw/reference-mobile.json nav.navRect)

## Typography Map (desktop snapshot)

- Body: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" / 16px / 30px
- H1: rinter, "rinter Fallback" / 70px / ls -3.5px
- H2: rinter, "rinter Fallback" / 55px / ls -2.75px
- Paragraph: "Source Code Pro", "Source Code Pro Fallback" / 14px / ls -0.42px

## Typography Map (mobile snapshot)

- H1: 40px / lh 40px / ls -2px (docs/forensics/raw/reference-mobile.json typography.h1)
- H2: 30px / lh 33px / ls -1.5px (docs/forensics/raw/reference-mobile.json typography.h2)

## Motion tokens (extracted)

- Duration: `--default-transition-duration: .15s` (docs/forensics/raw/reference-desktop.json rootVars)
- Ease: `--default-transition-timing-function: cubic-bezier(.4,0,.2,1)` (docs/forensics/raw/reference-desktop.json rootVars)
