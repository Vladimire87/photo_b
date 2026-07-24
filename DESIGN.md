---
name: PHOTO B
description: A midnight cinematheque for a personal sequence of photographic issues
colors:
  midnight-cobalt: "#081A40"
  booth-black: "#050A12"
  projector-yellow: "#FFD84A"
  screen-white: "#F4F3ED"
  reel-blue: "#91A6CA"
  frame-line: "rgba(145, 166, 202, 0.42)"
typography:
  display:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "clamp(3.6rem, 7vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Spline Sans, Arial, sans-serif"
    fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  structural: "0"
spacing:
  module-gap: "1px"
  page-gutter: "clamp(0.75rem, 1.35vw, 1.5rem)"
  section: "clamp(5rem, 9vw, 10rem)"
components:
  entry-control:
    backgroundColor: "{colors.projector-yellow}"
    textColor: "{colors.booth-black}"
    typography: "{typography.label}"
    rounded: "{rounded.structural}"
    padding: "0.8rem 0.9rem"
    height: "3.5rem"
  program-frame:
    backgroundColor: "{colors.midnight-cobalt}"
    textColor: "{colors.screen-white}"
    rounded: "{rounded.structural}"
    padding: "clamp(1.4rem, 2vw, 2.2rem)"
---

# Design System: PHOTO B

## Overview

**Creative North Star: "Midnight Cinémathèque"**

PHOTO B behaves like a late repertory screening rather than a magazine or social feed. Photographs are projected frames; issues are programs; navigation is the quiet apparatus that controls the sequence. The interface is spatial, dark, and decisive, with image light carrying more visual weight than decoration.

The world uses projection-booth geometry: hard frame edges, numbered cue marks, program rails, abrupt fields of color, and measured transitions. It must never drift back toward warm editorial paper, decorative serif typography, rounded cards, glass panels, or generic black-and-neon portfolio styling.

**Key Characteristics:**

- Drenched midnight-cobalt fields with one projector-yellow signal color.
- Square, frame-like surfaces with no ornamental radius.
- Condensed program typography for titles and calm grotesk text for reading.
- Large photographic beats separated by compact issue notation.
- Motion behaves like a projector gate: reveal, hold, advance.

## Colors

The palette is a dark screening room interrupted by a controlled beam of warm light.

### Primary

- **Midnight Cobalt** (`#081A40`): the dominant field across navigation and main surfaces.
- **Projector Yellow** (`#FFD84A`): active navigation, cue marks, focus, and current-state notation only.

### Secondary

- **Booth Black** (`#050A12`): deeper framing behind images and lightbox-adjacent surfaces.
- **Reel Blue** (`#91A6CA`): secondary metadata and inactive controls.

### Neutral

- **Screen White** (`#F4F3ED`): primary text and image-failure surfaces.

**The Signal Rule.** Projector Yellow communicates selection, focus, or sequence; it is never scattered as decoration.

## Typography

**Display Font:** Archivo Black (with Arial Black fallback)
**Body Font:** Spline Sans (with Arial fallback)
**Label Font:** Archivo Narrow (with Arial Narrow fallback)

**Character:** Display type should feel cut for a cinema program board, while body text remains contemporary and highly readable. Labels may use compact uppercase because they operate as indexing, not as decorative eyebrows.

**The Program Rule.** Large display type states the current viewing context once; compact labels carry all repeated issue and image notation.

## Layout

Desktop uses a twelve-column projection grid with a fluid page gutter and 1px modular seams. The opening pairs a three-column sticky program panel with a nine-column photographic stage, then moves into a variable sequence of twelve-, eight-, six-, and four-column frames. Navigation stays visually secondary but remains reachable without crossing the photograph.

Collections use repeatable screening-program blocks rather than generic cards. About uses the same frame geometry with a slower, text-led pace.

At 1100px the stage becomes a six-column layout. At 680px the program becomes a compact opening band, issue state and photo position share one row, and every photograph uses the full available width. A short-screen treatment at 650px height reveals the first photograph inside the opening viewport. Nothing relies on hover or off-screen stagger.

## Elevation & Depth

The system has no conventional shadows and no glass. Depth comes from nested dark fields, image luminance, hard occlusion, and the contrast between the cobalt room and black frame apertures. Image hover may brighten like a projector lamp but must not lift like a card.

## Shapes

All structural surfaces are square. Thin frame lines, crop marks, side rails, and rectangular apertures form the geometry. Circles are reserved for cue dots and status markers.

## Components

### Program Header

The header is assembled from adjacent square modules separated by 1px reel-blue seams. The wordmark, primary navigation, issue navigation, and photo position are independently legible. On mobile the final two modules share a row.

### Program Panel

The opening panel holds one functional cue, the title, one-sentence context, issue year, and a projector-yellow entry control. It is sticky on desktop and static on mobile.

### Photographic Frames

Frames sit on booth-black apertures and preserve each photograph's natural aspect ratio with `object-fit: contain`. The first frame owns the full photographic stage; later frames vary by editorial span. Failed frames retain their place and explain the error.

### Collection Programs

Each collection is one split screening block: cover on the left, issue status on the right. Mobile stacks the same block without changing its information order.

### Navigation

Primary links use the label face and a bottom projector-yellow cue for current state. Focus uses a solid 3px signal outline. Disabled issue controls remain visible but quiet so the sequence is understandable.

## Do's and Don'ts

### Do:

- **Do** let one photograph dominate the opening viewport.
- **Do** use issue numbers and view position as functional wayfinding.
- **Do** keep transition timing deliberate and reduced-motion safe.
- **Do** preserve clear focus states and 44px mobile targets.

### Don't:

- **Don't** use warm cream paper, editorial serifs, or italic display accents.
- **Don't** use rounded cards, pills, glass, glow borders, or decorative gradients.
- **Don't** turn every label into uppercase microcopy; reserve it for program notation.
- **Don't** crop photographs merely to regularize the grid.
