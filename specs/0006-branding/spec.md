# 0006 — Branding

**Status:** Built. Logo real (wordmark en header, OG image, apple-icon), paleta afinada, Cormorant + Geist, metadata + manifest. Gate verde (135 unit + 15 e2e).
**PRD:** §2.1, §4.1; RNF-04, RNF-05
**RFC:** §2.1 (Tailwind palette from the logo — verde salvia / beige)

## Why

The walking skeleton uses a text wordmark and placeholder colours. RenovArte
needs its real identity: logo, finalized palette, typography, and the metadata
that makes the site look intentional when shared or found.

## User value

- The site looks like RenovArte's own brand, on mobile and desktop; links shared
  on WhatsApp show a proper title, description and image.

## Scope

In:
- Real logo asset(s) (SVG preferred) in `public/`, used in header and as favicon
  / `app/icon`.
- Finalized `sage` + `beige` colour scales in `src/app/globals.css` `@theme`
  (Tailwind v4 — there is no `tailwind.config.ts`), derived from the logo;
  documented (hex + usage) in the README or a `docs/brand.md`.
- Typography: pick and load font(s) via `next/font` (no external CSS fetch).
- `app/opengraph-image` (or static OG image) + complete `metadata`
  (title template, description, `openGraph`, `twitter`).
- `manifest`/theme-color, `apple-touch-icon`.
- Responsive QA pass across home, category, detail at 390 / 768 / 1280px.

Out: full design system / Storybook; animations; dark mode (only if trivial).

## Acceptance criteria

1. **AC-1 (PRD §4.1):** The RenovArte logo appears in the header and as the
   browser tab icon on all routes. *Verified by:* Playwright asserts the logo
   `img`/`svg` in the header; manual favicon check.
2. **AC-2 (RFC §2.1):** `globals.css` `@theme` exposes named `sage` and `beige`
   scales used consistently; no stray hard-coded hex in components. *Verified by:*
   grep / review.
3. **AC-3:** Sharing the home URL produces a card with title, description and an
   image (OG tags present and valid). *Verified by:* meta inspection / a
   share-debugger.
4. **AC-4 (RNF-04):** No layout breakage or horizontal scroll at 390 / 768 /
   1280px on home, category and detail. *Verified by:* Playwright multi-viewport.
5. **AC-5 (RNF-05):** Brand colours + usage are documented for future
   contributors. *Verified by:* `docs/brand.md` (or README section) exists.
