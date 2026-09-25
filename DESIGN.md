---
name: PHOTO B
description: A midnight cinematheque for a personal sequence of photographic issues
colors:
  midnight-cobalt: "#081D39"
  booth-black: "#050A12"
  projector-yellow: "#F7D91A"
  screen-white: "#FFFFFF"
  reel-blue: "#91A6CA"
  aperture-cool: "#0B1630"
  aperture-deep: "#081126"
  aperture-signal: "#102653"
  frame-line: "rgba(145, 166, 202, 0.56)"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(4.55rem, 7.2vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 0.89
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.6rem, 7vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.86
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Lora, Georgia, serif"
    fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.6
  meta:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.045em"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  structural: "0"
spacing:
  module-gap: "1px"
  page-gutter: "clamp(1rem, 3.4vw, 2.25rem)"
  section: "clamp(2rem, 4vw, 4.5rem)"
components:
  entry-control:
    backgroundColor: "transparent"
    textColor: "{colors.projector-yellow}"
    typography: "{typography.label}"
    rounded: "{rounded.structural}"
    padding: "0.55rem 0.65rem"
    height: "3rem"
  program-frame:
    backgroundColor: "{colors.midnight-cobalt}"
    textColor: "{colors.screen-white}"
    rounded: "{rounded.structural}"
    padding: "0.625rem 1rem 1rem 3px"
---

# Design System: PHOTO B

## Overview

**Creative North Star: "Midnight Cinémathèque"**

PHOTO B behaves like a late repertory screening rather than a magazine or social feed. Photographs are projected frames; issues are programs; navigation is the quiet apparatus that controls the sequence. The interface is spatial, dark, and decisive, with image light carrying more visual weight than decoration. Gallery, Collections, and About share the same compact header, cobalt field, square frame geometry, and restrained yellow signals.

The world uses projection-booth geometry: hard frame edges, numbered cue marks, program rails, abrupt fields of color, and measured transitions. Lora brings a quiet literary note to short prose while condensed Barlow Condensed keeps titles and image metadata legible at a glance. Avoid warm paper fields, ornamental type, rounded cards, glass panels, and generic black-and-neon portfolio styling.

**Key Characteristics:**

- Drenched midnight-cobalt fields with one projector-yellow signal color.
- Square, frame-like surfaces with no ornamental radius.
- Barlow Condensed for the wordmark, titles, navigation, captions, and program notation; Lora for prose.
- Large photographic beats separated by compact issue notation.
- Motion behaves like a projector gate: reveal, hold, advance.

## Colors

The palette is a dark screening room interrupted by a controlled beam of warm light.

### Primary

- **Midnight Cobalt** (`#081D39`): the dominant field across navigation and main surfaces.
- **Projector Yellow** (`#F7D91A`): active navigation, cue marks, focus, and current-state notation only.

### Secondary

- **Booth Black** (`#050A12`): deeper framing behind images and lightbox-adjacent surfaces.
- **Reel Blue** (`#91A6CA`): secondary metadata and inactive controls.
- **Aperture Cool** (`#0B1630`): the quiet loading field behind gallery and collection images.
- **Aperture Deep** (`#081126`) and **Aperture Signal** (`#102653`): the restrained warm-up range for an unresolved image aperture.

### Neutral

- **Screen White** (`#FFFFFF`): primary text and image-failure surfaces.

**The Signal Rule.** Projector Yellow communicates selection, focus, or sequence; it is never scattered as decoration.

## Typography

**Display and Index Font:** Barlow Condensed (with Arial Narrow fallback)
**Prose Font:** Lora (with Georgia fallback)

**Character:** Display type should feel cut for a cinema program board. Lora appears only in short editorial prose and captions; compact uppercase labels function as indexing, not decorative eyebrows.

### Observed Role Scale

- **Gallery display** uses `clamp(4.55rem, 7.2vw, 5.5rem)` and breaks into two deliberate lines.
- **Editorial page titles** use `clamp(3.6rem, 7vw, 6rem)`; the About statement is `clamp(3.7rem, 6vw, 5.5rem)` on desktop.
- **Collection issue titles** use `clamp(1.75rem, 3vw, 3.75rem)`.
- **Featured photograph captions** use `clamp(0.9rem, 1.4vw, 1.25rem)` in the side rail, keeping names together on two balanced lines where needed.
- **Meta** carries photograph numbers, captions, and counts at `0.74rem`; **micro** carries compact cues and unavailable-image notices at `0.72rem`.
- Program-end issue markers use `clamp(1.5rem, 2.8vw, 2rem)`.
- Mobile overrides may compress a role to protect fit and preserve the 44px target rule; they are functional adaptations, not new visual voices.

**The Program Rule.** Large display type states the current viewing context once; compact labels carry all repeated issue and image notation.

## Layout

Desktop uses a twelve-column projection grid with a fluid page gutter and 1px modular seams. The opening pairs a quiet three-column issue panel with a nine-column photographic stage. Portrait-led issues use a deliberate editorial cadence: three photographs, a five-photograph strip, a full-width feature with a two-column caption rail, then full-width four- and five-photograph rows. Additional photographs repeat the four/five rhythm; shorter or landscape-led issues fall back to the adaptive aspect-ratio packer. A ruled, full-width colophon closes the issue. Navigation stays visually secondary but remains reachable without crossing the photograph.

Collections use repeatable screening-program blocks rather than generic cards. About uses the same frame geometry with a slower, text-led pace.

At 900px the opening becomes a four-column issue panel beside an eight-column stage. At 840px the header wraps into two compact rows. At 680px the issue introduction moves above the stage and photographs use the full available width; the phone header groups the wordmark, navigation, and issue status into three clear rows. Collections stack cover and issue information, while About turns into a single-column text frame. Nothing relies on hover or off-screen stagger.

## Elevation & Depth

The system has no conventional shadows and no glass. Depth comes from nested dark fields, image luminance, hard occlusion, and the contrast between the cobalt room and black frame apertures. Image hover may brighten like a projector lamp but must not lift like a card.

## Shapes

All structural surfaces are square. Thin frame lines, crop marks, side rails, and rectangular apertures form the geometry. Circles are reserved for cue dots and status markers.

## Components

### Program Header

The header is a compact sticky row with the wordmark, centered primary navigation, and current issue. A thin reel-blue rule anchors it; active navigation receives one projector-yellow underline. Photo position remains available to assistive technology and appears beside issue status at narrower widths. On tablet the header becomes two rows; on mobile the wordmark, navigation, and issue status each get a concise row.

### Program Panel

The opening panel holds the current issue, two-line title, one-sentence context, photo count, and issue/year. It stays in the page flow beside the gallery on desktop and becomes an opening introduction above the photographs on mobile. The 18+ confirmation stays in its separate entry gate.

### Photographic Frames

Frames sit on quiet dark apertures. The editorial composition uses fixed, reference-derived slots with controlled `object-fit: cover` crops so the 3/5/feature/4/5 cadence stays stable across issues. The adaptive fallback preserves each photograph's natural aspect ratio with `object-fit: contain` for short or landscape-led issues. Failed frames retain their place and explain the error.

### Collection Programs

Each collection is one square screening block: cover image on the left, issue number, date, latest status, and photo count on the right. Mobile stacks the same block without changing its information order.

### About

About uses a restrained cobalt frame rather than a separate accent-color panel. A condensed statement balances short Lora prose; a fine rule and quiet signature close the page. On mobile, the statement, prose, and signature stack inside the same square-edged frame.

### Program End

The full-width colophon closes each issue with an end cue, issue/year, live photograph count, and a bracketed next step. A lower ruled row carries the prior issue link and numbered photo range. The row reorganizes at tablet and mobile widths without clipping its text.

### Navigation

Primary links use the label face and a bottom projector-yellow cue for current state. Focus uses a solid 3px signal outline. Disabled issue controls remain visible but quiet so the sequence is understandable.

## Do's and Don'ts

### Do:

- **Do** let one photograph dominate the opening viewport.
- **Do** use issue numbers and view position as functional wayfinding.
- **Do** keep transition timing deliberate and reduced-motion safe.
- **Do** preserve clear focus states and 44px mobile targets.

### Don't:

- **Don't** use warm cream paper, decorative serif styles, or italic display accents; keep Lora to prose and captions.
- **Don't** use rounded cards, pills, glass, glow borders, or decorative gradients.
- **Don't** turn every label into uppercase microcopy; reserve it for program notation.
- **Don't** use a free-form image feed where the curated issue rhythm is the point.
