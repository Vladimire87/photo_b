---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["src/main.ts", "src/styles.css"]
---

## Scope and mode

- Full public PHOTO B surface: Gallery, Collections, About, maturity gate, and lightbox.
- Visitor mode: Experience. User-selected direction: art journal, expressive grotesk, large photographs, dark background; seed `5a4938b4`.

## Audience and job

Visitors open the latest personal selection, browse individual photographs, and revisit numbered issues through Collections. Photographs, real captions and counts, and stable issue URLs provide the content.

## Constraints

Preserve the static Vite build, issue text-file publishing, external image URLs, lazy loading, keyboard and touch access, image-failure states, and accessible 18+ confirmation. Request no photographs before confirmation. Keep the PHOTO B mark and established cobalt/yellow identity. Do not invent issues, social proof, locations, or commercial rights; the commercial model remains undecided.

## Chosen direction

- The first body comment records THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, and FORM for the chosen art journal.
- Archivo variable display type and Onest text are self-hosted; native width settings replace transform-based compression. Text wraps without forced breaks.
- Gallery opens with a typographic issue column beside a natural-proportion three/five photographic stage. A page-wide feature introduces a side caption rail, then four/five rows continue across the page; later rows adapt to the remaining images. Shorter or unsuitable issues use the adaptive packer.
- Collections uses two contained-cover poster columns on desktop and one on phones. About balances a large statement with concise prose and a latest-issue action in an open layout.
- At 680px and below photographs form one source-order column. At 380–680px brand and primary navigation share a row; the Gallery issue switcher sits below. Narrower phones stack brand and navigation.
- The issue close has live issue/year, photograph count, next action, history link when available, and photo range. The viewer retains dark captions and square 48px controls on desktop and phones.

## Finish evidence

Final review disposition: ship after the desktop lightbox theme and decorative end label were corrected. Source of truth: `index.html`, `src/styles.css`, and `src/main.ts`. Captured desktop/phone states are in `.playwright-mcp/final-*.png`; final corrective review evidence is in `.playwright-mcp/review-lightbox-*.png` and `.playwright-mcp/review-end-*.png`. The local production build was checked at 390px and 1440px for Gallery, Collections, and About: Archivo/Onest loaded, no horizontal overflow or page errors, and the repaired viewer theme held. Full E2E: 47 passed and 3 desktop-only cases skipped; focused follow-up: 8 passed; unit: 4 passed. One older externally hosted photograph remains unavailable; its failure frame is preserved. Review evidence is local; it does not establish production deployment.

## Unresolved

Future commercial behavior and content rights remain undecided.
