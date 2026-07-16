# PHOTO B

An editorial, mobile-first photo gallery inspired by premium print layouts. The
site is static: photographs stay on their original hosts and are loaded by URL.

## Add photographs

Open `src/data/photos.txt` and add one absolute HTTPS image URL per line. Put an
optional caption after `|`:

```text
https://images.example.com/my-photo.jpg | AEGEAN LIGHT
https://images.example.com/another-photo.webp
```

Blank lines and lines beginning with `#` are ignored. When a caption is omitted,
the card displays only its automatic number. The gallery assigns numbers and
layout sizes automatically. Keep the source URLs public and hotlinkable; hosts
that block embedding will show the gallery's unavailable image state.

## Local development

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## Checks and production build

```bash
npm run test:unit
npm run test:e2e
npm run build
```

The production-ready static files are written to `dist/` and can be published on
any static host.
