# PHOTO B

An editorial, mobile-first photo gallery inspired by premium print layouts. The
site is static: photographs stay on their original hosts and are loaded by URL.

## Add photographs and issues

Issue files live in `src/data/issues` and use the `YYYY-NN.txt` naming format.
For example, `2026-02.txt` becomes `ISSUE 02 — 2026`. The newest issue opens by
default, and older issues remain available through the previous/next controls.

To publish a new issue, create the next file and add one absolute HTTPS image
URL per line. Put an optional caption after `|`:

```text
https://images.example.com/my-photo.jpg | AEGEAN LIGHT
https://images.example.com/another-photo.webp
```

Blank lines and lines beginning with `#` are ignored. When a caption is omitted,
the card displays only its automatic number. The gallery assigns numbers and
layout sizes automatically — wide photographs (aspect ratio 1.4 and above) are
promoted to full-width feature frames between rows of smaller frames. Reddit
preview URLs are signed for their exact `width` parameter, so those images are
served as single responsive candidates instead of generated variants. Keep the
source URLs public and hotlinkable; hosts that block embedding will show the
gallery's unavailable image state. Only the selected issue is rendered, and
distant photographs are loaded as the visitor approaches them.

## Local development

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## Analytics

Yandex Metrica counter `111029295` is enabled by default. The tag records visits
and sends each opened photograph as a virtual page view under
`/photos/YYYY-NN/XX`. This makes the most-viewed photographs available in the
regular page reports without creating a separate goal.

Tracking starts only after the visitor confirms the 18+ notice (or has an
unexpired confirmation from the last 30 days), and never runs on the About
page. There is no tracking pixel for visitors without JavaScript.

Set `VITE_YANDEX_METRIKA_ID` only when building for a different counter.

## Checks and production build

```bash
npm run test:unit
npm run test:e2e
npm run build
npm run check:images
```

`npm run check:images` verifies that every image URL in `src/data/issues` is
still reachable and exits with an error when any link is dead. Run it before
publishing a new issue — external hosts (especially Reddit preview URLs) remove
or re-sign images over time, and dead photos silently disappear from the
gallery. The check is intentionally kept out of the automated tests because
upstream hosts may block datacenter IPs.

The production-ready static files are written to `dist/`, including a generated
`sitemap.xml` that lists the home page, Collections, About, and every issue.

## Continuous integration

The GitHub Actions workflow in `.github/workflows/ci.yml` runs typechecking,
unit tests, end-to-end tests, and the production build on every push to `main`
and on every pull request.

## Deploy to Cloudflare Pages

Git deployment is the recommended option: every push to the production branch
is built and published automatically, while pull requests receive preview URLs.

1. Push this project to a GitHub or GitLab repository.
2. In Cloudflare, open **Workers & Pages**, create a Pages application, and
   connect the repository.
3. Use these build settings:
   - Production branch: `main` (or the branch used by the repository)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave empty
4. No environment variables, Functions, databases, or storage bindings are
   required.
5. Deploy. Cloudflare provides a `*.pages.dev` address automatically.

The repository pins Node.js in `.node-version`. Security headers are copied from
`public/_headers` into every production build.

To connect a domain after the first deployment, open the Pages project, choose
**Custom domains**, and select **Set up a domain**. Follow the DNS instructions
shown by Cloudflare; HTTPS certificates are issued automatically.
