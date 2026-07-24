# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is the public: visitors who want to browse a curated
selection of photography. The owner acts as the curator and publisher, adding
photographs and organizing them into issues.

## Product Purpose

PHOTO B is a public editorial photo gallery that combines a personal archive,
an online photo journal, and a portfolio. It gives visitors a focused way to
discover and revisit selected photographs without turning the collection into
an endless feed.

The product is intended to support commercial use in the future. The specific
commercial model is still undecided.

## Positioning

PHOTO B presents one curator's personal selection as a sequence of numbered
issues. The selection and issue structure are the product's editorial
mechanism; it is not an open upload platform or a general-purpose image feed.

## Operating Context

Visitors open the latest issue, browse its editorial gallery, view individual
photographs in a lightbox, move between issues, and use the Collections archive
to revisit older selections.

The curator publishes an issue by adding an issue text file under
`src/data/issues`. Each entry is an absolute HTTPS image URL with an optional
caption. The static site is built with Vite and can be deployed to Cloudflare
Pages.

## Capabilities and Constraints

- The site is a static, mobile-first web experience.
- Issues use stable `YYYY-NN` identifiers and the newest issue opens by default.
- Photographs remain on external hosts and are loaded by URL; availability
  therefore depends on those hosts allowing embedding.
- The current product has no visitor accounts, uploads, payments, or purchasing
  workflow.
- The current interface and editorial copy are in English.
- The future commercial model and the functionality required for it are open
  decisions.
- Current issue files contain links sourced from Reddit. Rights for commercial
  reuse have not been confirmed, so this content must not be represented as
  licensed or commercially cleared.

## Brand Commitments

The existing product name is PHOTO B. Its established terminology includes
issues, collections, latest, and photographs. The product speaks as a personal
curated selection rather than an institutional archive or an open community.

## Evidence on Hand

- The implemented gallery, issue navigation, Collections archive, About page,
  and lightbox are in `index.html` and `src/main.ts`.
- The issue publishing format is documented in `README.md` and implemented in
  `src/data/issues`.
- Existing automated tests cover responsive layout, issue navigation, lazy
  loading, the archive, the About page, and failed external images.
- Brand assets exist under `public/assets`.
- No verified licenses, testimonials, customers, sales, commercial
  partnerships, or performance claims are currently on hand. Future work must
  not fabricate them.

## Product Principles

1. Curate deliberately rather than becoming an endless image feed.
2. Keep photographs central and navigation secondary.
3. Make each issue stable, browsable, and worth revisiting.
4. Keep publishing simple enough for one curator to maintain.
5. Separate future commercial ambition from unverified rights or invented
   commercial proof.

## Accessibility & Inclusion

The public gallery must remain usable across mobile and desktop viewports,
support keyboard navigation, expose meaningful navigation and image states to
assistive technology, and remain understandable when an external image fails.
