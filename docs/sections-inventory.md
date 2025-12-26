# Sections Inventory (Hatamex /en)

01) The space between creativity and code
- Purpose: Above-the-fold positioning + primary CTAs.
- Key elements: eyebrow "NOW CREATING", H1 hero title, lede paragraph, 2 CTAs (Book a call / Explore our work), rating label "5.0".
- Responsive notes: H1 stays 40px through 834px wide; switches to 70px on >=1024px (evidence: docs/forensics/raw/reference-*.json typography.h1).
- Motion notes (trigger + properties): Entrance reveals on load (opacity/transform) observed across hero content (evidence: reference DOM includes transform/opacity states; captured in Playwright screenshots with motion disabled for diffs).
- Editable fields (client-safe edits): hero headline, lede copy, CTA labels/links.

02) Trusted by innovators worldwide
- Purpose: Trust proof via logo strip.
- Key elements: "Trusted by innovators worldwide" label + scrolling/row of client logos.
- Responsive notes: Logo row compresses to single line; wraps/scrolls depending on breakpoint (TBD exact behavior).
- Motion notes (trigger + properties): Likely continuous marquee (TBD; requires JS/CSS keyframes evidence).
- Editable fields (client-safe edits): label text (optional), logo count/order.

03) The agency that gives your brand the support it’s been looking for
- Purpose: High-level positioning statement.
- Key elements: H2 headline + supporting paragraph.
- Responsive notes: H2 is 30px through 834px wide; switches to 55px on >=1024px (evidence: docs/forensics/raw/reference-*.json typography.h2).
- Motion notes (trigger + properties): Title/copy entrance reveals (TBD exact stagger).
- Editable fields (client-safe edits): headline, paragraph copy.

04) Impact you can feel
- Purpose: Outcomes framing + proof bullets + About CTA.
- Key elements: "RESULTS" label, H2 headline, paragraph, 3 bullet points, "LEARN MORE ABOUT US" CTA.
- Responsive notes: Section switches from stacked to multi-column layout on desktop (TBD exact grid).
- Motion notes (trigger + properties): Entrance reveals; bullets likely stagger (TBD exact).
- Editable fields (client-safe edits): headline, paragraph, bullets, CTA label/link.

05) Creativity
- Purpose: Explain Hatamex’s three pillars (Creativity/Technology/Conversion).
- Key elements: "WE SEE WHAT OTHERS MISS" label, large statement text, 3 pillar titles + paragraphs, "LET’S WORK TOGETHER" CTA.
- Responsive notes: Pillars stack on smaller screens, become columns on larger screens (TBD exact breakpoint).
- Motion notes (trigger + properties): Large statement likely reveal; pillar items stagger (TBD exact).
- Editable fields (client-safe edits): statement, 3 pillar titles/copy, CTA label/link.

06) Expertise that performs
- Purpose: Service overview + deep links.
- Key elements: "SERVICES" label, H2 headline, intro paragraph, 4 services with description + "LEARN MORE" links.
- Responsive notes: Services grid densifies on desktop (TBD exact columns).
- Motion notes (trigger + properties): Cards reveal with stagger (TBD exact).
- Editable fields (client-safe edits): intro copy, service titles/descriptions/links.

07) Featured cases
- Purpose: Showcase selected case studies + link to Cases page.
- Key elements: "CASES" label, H2 headline, intro paragraph, featured case cards, "VIEW MORE CASES" CTA.
- Responsive notes: Cards are likely a carousel/slider on smaller screens (TBD; keen-slider is loaded by reference CSS).
- Motion notes (trigger + properties): Carousel transitions (TBD) + entrance reveals.
- Editable fields (client-safe edits): case titles, categories, descriptions, CTA link.

08) The drive behind everything we build
- Purpose: Strategic values list.
- Key elements: "STRATEGIC FOUNDATION" label, H2 headline, intro paragraph, 5 value bullets (Clarity/Partnership/Engineering/Evolution/Leadership).
- Responsive notes: Single column list (likely) with spacing changes per breakpoint (TBD exact).
- Motion notes (trigger + properties): Entrance reveal; list stagger (TBD exact).
- Editable fields (client-safe edits): intro copy, value titles/copy.

09) A framework that drives excellence
- Purpose: Process explanation + Contact CTA.
- Key elements: "OUR PROCESS" label, H2 headline, intro paragraph, 5 steps (Insight/Strategy/Build/Launch/Support), "TAKE THE FIRST STEP" CTA.
- Responsive notes: Steps likely render as cards/columns on desktop (TBD exact).
- Motion notes (trigger + properties): Steps stagger (TBD exact).
- Editable fields (client-safe edits): intro copy, step titles/copy, CTA label/link.

10) Ready to create impact that lasts?
- Purpose: Final conversion section for booking.
- Key elements: "BOOK A CALL" label, H2 headline, 3 bullets, signature line "Tarik Polat, Founder", alternate contact CTA.
- Responsive notes: Likely 2-column layout on desktop with scheduling UI; simplified to text in this build (TBD exact embed).
- Motion notes (trigger + properties): Entrance reveals; bullets stagger (TBD exact).
- Editable fields (client-safe edits): headline, bullets, signature, CTA label/link.
