# PHOTO B social preview

The active Open Graph and Twitter artwork is `public/assets/photo-b-og-editorial.jpg`: a 1200 × 630 photographic cover in the site's ink navy, warm ivory, and pale gold palette. It uses a fictional adult fashion portrait created with the built-in `image_gen` tool. The finished artwork was resized and encoded as JPEG for delivery.

The image has its own filename so the new metadata does not point to the previous red-and-cream artwork. Keep `og:image`, `og:image:secure_url`, and `twitter:image` aligned, and keep the declared MIME type and dimensions equal to the exported file.

## Generation prompt

```text
Use case: ads-marketing.
Asset type: a finished raster Open Graph cover for PHOTO B, a personal photography art journal. Create a very wide 40:21 landscape composition, ideally 2560 x 1344 pixels (same aspect ratio as a 1200 x 630 social card), not a mockup.

Scene/backdrop: full-bleed ink-navy near-black (#0b1726) with very subtle silver-gelatin film grain. A luxurious, high-contrast monochrome fashion photograph fills the right two thirds and dissolves naturally into shadow on the left.
Subject: a fictional, clearly adult woman around 30, with dark slightly wet hair brushed back, sculptural cheekbones, natural skin texture and an arresting, confident gaze toward the camera. She wears an opaque black silk evening dress with an open back; the crop shows her face, neck, one bare shoulder and upper back. Sexy, sensual, sophisticated art direction through gaze, light and silhouette. Fashion editorial, not lingerie advertising.
Style/medium: photorealistic black-and-white fashion photography, cinematic hard side light and soft sculptural shadows, shot on film. The photograph should feel like an independent luxury art magazine, with real skin texture, not glossy plastic AI beauty.
Composition/framing: extremely strong visual hierarchy at thumbnail size. Face fully readable on the right; generous dark negative space for typography on the left. Large editorial brand typography anchored on the left, vertically around the middle, with a smaller line near the lower left. Keep all important text and the face within generous safe margins so the cover also survives modest social-preview cropping.
Color palette: ink navy #0b1726, warm ivory #f4f1e9 typography, and a restrained warm pale-gold #e8cf81 secondary line; photograph is monochrome.
Text (verbatim): "PHOTO B" as the dominant masthead, all on one line, in oversized heavy condensed Swiss grotesk typography similar to Archivo, tightly kerned, crisp and beautifully typeset. Secondary text: "PHOTOS I KEEP" in compact, widely spaced uppercase sans serif. Only these two text elements.
Constraints: finished clean artwork filling the entire canvas, fully clothed adult subject, no nudity, no third-party branding, no invented people or publication credits.
Avoid: red-and-cream poster look, borders, cards, pills, icons, stock watermarks, unrelated text, fake magazine issue details, neon glow, decorative gradients, collage, tiny unreadable typography, distorted letters, airbrushed skin.
```

## Final composition correction

```text
Edit the supplied PHOTO B cover. This is a canvas/aspect-ratio correction, not a new creative direction.
The final cover must have a 1.9047619:1 aspect ratio, the exact shape of a 1200 x 630 Open Graph card. It is a moderately wide landscape rectangle, NOT a 2.4:1 cinema banner.
Expand the composition vertically, adding matching ink-navy photographic background above and below and naturally extending the adult subject's hair, shoulder and black silk dress as needed. Recompose proportionally inside that 40:21 frame; do not stretch any anatomy or lettering and do not crop the masthead.
Preserve the same clearly adult woman, face, gaze, natural skin texture, bare upper shoulder, opaque black silk dress, monochrome cinematic light and film grain. Preserve the excellent heavy condensed ivory masthead "PHOTO B" and the smaller pale-gold "PHOTOS I KEEP", with no additional text. Keep the masthead large and clear on the left and the woman's face clear on the right. Maintain generous safe margins. No border or letterbox bars: outpaint the photograph to fill the whole 40:21 frame. Export the finished artwork, ideally 2560 x 1344 pixels.
```
