---
name: PHOTO B
description: A dark art journal for a personal sequence of photographic issues
colors:
  midnight-cobalt: "#081d39"
  booth-black: "#050a12"
  projector-yellow: "#f7d91a"
  screen-white: "#ffffff"
  reel-blue: "#a5b7d3"
  aperture-deep: "#081126"
  frame-line: "rgba(165, 183, 211, 0.28)"
  control-line: "rgba(255, 255, 255, 0.65)"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(3rem, 6.5vw, 6rem)"
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(2rem, 3.2vw, 3rem)"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  prose:
    fontFamily: "Onest, Arial, sans-serif"
    fontSize: "clamp(1rem, 1.4vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Onest, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Onest, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.6
  meta:
    fontFamily: "Onest, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  structural: "0"
spacing:
  module-gap: "1px"
  page-gutter: "clamp(1rem, 3vw, 3rem)"
components:
  entry-control:
    backgroundColor: "transparent"
    textColor: "{colors.projector-yellow}"
    typography: "{typography.label}"
    rounded: "{rounded.structural}"
    padding: "0.75rem 1rem"
  entry-control-hover:
    backgroundColor: "{colors.projector-yellow}"
    textColor: "{colors.booth-black}"
  entry-control-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.reel-blue}"
    padding: "0.75rem 0"
  maturity-primary:
    backgroundColor: "{colors.projector-yellow}"
    textColor: "{colors.booth-black}"
    rounded: "{rounded.structural}"
    padding: "0.85rem 1.25rem"
  maturity-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.screen-white}"
    rounded: "{rounded.structural}"
    padding: "0.85rem 1.25rem"
---

# Design System: PHOTO B

## Overview

**Creative North Star: "Midnight Art Journal"**

PHOTO B is a dark art journal for a personal selection of photographs. Large, expressive grotesk headings establish each surface; photographs carry the composition, while quiet text and numbered issues make it easy to return to a selection. Gallery, Collections, About, and the viewer share the established cobalt and yellow identity.

The inherited square framing and restrained signal color remain. Archivo replaces the previous condensed display face; Onest gives prose, navigation, and captions a clear common voice. Generous photographic space and short text keep the journal deliberate on desktop and readable on phones.

**Key Characteristics:**

- Midnight-cobalt fields with yellow wayfinding.
- Variable Archivo display type and readable Onest text.
- Natural photographic proportions, square edges, and thin rules.
- Large photographic beats balanced by concise issue information.
- Responsive layouts, visible focus, and reduced-motion support.

## Colors

The established cobalt field stays dominant; yellow supplies warm, functional contrast.

### Primary

- **Midnight Cobalt:** the page, masthead, and common background.
- **Projector Yellow:** active links, focus outlines, issue/photo numbers, and primary actions.

### Neutral

- **Booth Black:** image apertures, the maturity panel, and the near-black viewer overlay.
- **Screen White:** primary text; it also fills maturity actions on hover.
- **Reel Blue:** supporting prose, captions, counts, and inactive links.
- **Aperture Deep:** the quiet loading placeholder behind unresolved images.
- **Frame Line / Control Line:** subdued section dividers and stronger secondary-action borders.

**The Signal Rule.** Yellow identifies selection, focus, issue numbers, and the next action; it stays subordinate to photographs.

## Typography

**Display Font:** Archivo, with Arial Narrow and sans-serif fallbacks.
**Body and Index Font:** Onest, with Arial and sans-serif fallbacks.

Both variable Latin fonts are self-hosted WOFF2 with `font-display: swap`. Archivo supports weights 400–800 and native widths 62.5–125%; Onest supports weights 400–700. Use the English content scope of these files; additional scripts need suitable font assets.

### Hierarchy

- **Display:** the frontmatter role supplies editorial page headings. Gallery uses `clamp(3rem, 5.3vw, 6rem)` with line-height 0.98 and a 6.5ch measure. Archivo headings use weight 750 and native width 75%; About and the maturity title use 85% on desktop.
- **Title:** issue titles and the closing issue marker use weight 650 and width 85%. The feature photograph number shares the title size.
- **Prose:** the maturity explanation uses the fluid prose role and a 36ch measure. About’s lead is a distinct `clamp(1.5rem, 2.4vw, 2rem)` treatment with line-height 1.4.
- **Body:** supporting copy uses the 16px role; About’s secondary prose has line-height 1.75 and a maximum measure of 65ch.
- **Label:** primary navigation uses 14px Onest at weight 500; actions use weight 600. Sentence case is the default.
- **Meta:** captions and supporting counts use 13px Onest. Photo numbers use weight 600 and tabular figures; long captions wrap at word boundaries.

At 680px and below, display becomes `clamp(2.5rem, 10.5vw, 4rem)` and title becomes `clamp(1.5rem, 6vw, 2rem)`. Gallery and About headings use their observed `clamp(2.5rem, 11vw, 4rem)` variant. The compact single-row phone navigation uses the meta size.

**The Type Width Rule.** Use Archivo’s native width axis for condensed headings. Let text wrap naturally; never compress glyphs with transforms or insert layout-only line breaks.

## Layout

Main surfaces share a 1920px maximum width and the fluid page gutter. Gallery starts on a twelve-column grid: a three-column introduction beside a nine-column photographic stage. Between 681px and 900px this becomes four columns beside eight. The eligible portrait-led sequence opens with three photographs, then five, a page-wide feature with a two-column caption rail, then four and five. Later rows adapt to remaining image proportions; shorter or unsuitable issues use the adaptive packer. This cadence belongs to Gallery, not every future surface.

Collections has two poster columns, with contained covers above issue information. About is an open text composition: a large statement on the left and short prose, signature, and latest-issue action on the right. It has no enclosing border box.

At 1100px and below, the issue switcher moves to a second masthead row and the Collections introduction stacks. At 680px and below, the page gutter is 1rem, Gallery becomes one full-width image column in source order, Collections becomes one poster column, and About stacks. From 380px through 680px, brand and primary navigation share one row; Gallery adds an issue row. Narrower phones stack brand and navigation. The phone header stays in normal flow; larger headers are sticky.

**The Photograph Rule.** Preserve source proportions. Compose the sequence through image size and spacing rather than crops that regularize every frame.

## Elevation & Depth

No conventional shadows or glass are used. Image luminance, near-black apertures, cobalt fields, and thin rules provide depth. Loaded images brighten slightly on hover-capable devices; they do not lift. Loading placeholders pulse, photographs settle through opacity, and all transitions and animation stop under reduced motion.

## Shapes

Structural corners are square. Rectangular photographs, poster covers, outlined actions, and thin horizontal rules carry the geometry. The existing PHOTO B mark remains the yellow identity asset; new decorative geometry is unnecessary.

## Components

### Masthead and Navigation

A compact common masthead carries the mark and wordmark, primary links, and Gallery’s issue switcher. Current navigation turns yellow with a 3px bottom rule. Navigation and issue controls have at least 44px targets. Disabled issue controls remain visible at reduced opacity. Live photo position is available to assistive technology, rather than a visible secondary counter.

### Actions

The entry action is a square yellow outline, at least 48px tall; hover fills it yellow with dark text. Quiet history links have no border and turn yellow on hover. Maturity actions are at least 52px tall: solid yellow primary and white-outline secondary, both turning white with dark text on hover. Focus uses a 3px yellow outline with a 4px offset; image/link frames inset that outline to avoid clipping.

### Photographic Frames

Images retain natural ratios with `object-fit: contain`. A number and optional caption sit underneath; desktop features move the caption into a side rail, while phones restore the normal caption row. Failed external images keep their layout slot and show an unavailable message. Loading and failure text uses the meta role.

### Collection Posters

A 4:5 cover aperture contains the source image. Below it, an Archivo issue title precedes the real photograph count and a yellow Latest marker when applicable. The entire poster is linked; hover highlights the issue title. It has no elevated card shell or badge pill.

### Issue Close

A ruled colophon shows the actual issue/year and photograph count, the next action, an optional history link, and the photo range. It uses an issue title rather than a decorative end label. On phones the action moves below the title and count.

### Maturity Gate and Viewer

Gallery and Collections require the accessible 18+ confirmation before photograph requests begin. The gate uses the same display face, dark panel, and action variants. The lightbox has a near-black overlay and dark captions, preserves the image proportions, and uses square 48px cobalt controls. Keyboard and touch browsing remain available; mobile viewer geometry respects safe areas.

## Do's and Don'ts

### Do:

- **Do** use the local Archivo and Onest files and the named type roles.
- **Do** keep issue counts, captions, and photo position tied to actual content.
- **Do** preserve visible keyboard focus, 44px navigation targets, and 48px viewer controls.
- **Do** verify natural wrapping, image failures, and horizontal overflow on phones.
- **Do** respect reduced motion and keep photograph requests behind the maturity confirmation.

### Don't:

- **Don't** introduce ornamental rounded cards, glass panels, glow borders, or display shadows.
- **Don't** use forced line breaks, horizontal type transforms, or tiny caption text to make a layout fit.
- **Don't** add decorative eyebrows or repeat section labels as ornament.
- **Don't** present external photographs as commercially cleared or invent product evidence.
