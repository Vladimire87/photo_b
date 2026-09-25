---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["src/main.ts","src/styles.css"]
---

## Scope and mode

- Scope: the full public PHOTO B surface in `index.html`, including Gallery, Collections, About, and lightbox states.
- Visitor mode: Experience.

## Audience and job

- Public visitors browse a personal sequence of photography without entering an endless feed.
- The main action is to enter the latest issue, move through photographs, and revisit prior issues through Collections.
- The photographs, real issue count, captions, and stable issue URLs are the proof and content.

## Constraints

- Preserve the static Vite implementation, external-image behavior, lazy loading, keyboard access, issue publishing format, mobile usability, and the existing 18+ confirmation flow.
- Do not represent the Reddit-sourced photographs as commercially cleared.
- Do not invent view counts, locations, testimonials, or additional issues.

## Chosen direction

- Midnight Cinémathèque: a continuous cobalt screening room, compact quiet header, square frame geometry, and projector-yellow signals.
- Barlow Condensed sets the wordmark, navigation, titles, captions, and issue notation; Lora is reserved for short prose and captions.
- Gallery opens with a quiet issue panel beside a curated 3/5 photographic stage; a featured frame then breaks the grid with a side caption rail, and the following four/five rows span the full page. Additional photos repeat the rhythm; short or landscape-led issues use the adaptive fallback.
- Collections pairs photographic covers with concise issue information. About keeps the same cobalt field and frame geometry, with a slower text-led layout.
- At mobile widths, panels and images stack in reading order; the issue state and photo position remain visible without horizontal overflow.
- Memorable moment: a quiet issue column opens beside the 3/5 stage, yields to a full-bleed featured frame, then continues as a full-width four/five-photo editorial grid.

## Unresolved

- Future commercial behavior and content rights remain undecided.
