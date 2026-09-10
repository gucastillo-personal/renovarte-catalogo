# 0001 — Walking skeleton · Plan

Checked against [`../constitution.md`](../constitution.md).

## Stack / tooling

- Next.js latest (App Router, TypeScript strict, ESLint, `src/` dir, Tailwind).
- Package manager: **pnpm**. Node pinned via `.nvmrc` + `package.json#engines`.
- Unit: **Vitest** (`environment: node`).
- E2E: **Playwright** (`webServer` runs `pnpm build && pnpm start`).

## Files

### Data + domain

- `public/data/products.json` — 3 seed products. **Only** RFC §2.4 keys:
  `id, proveedor, categoria, nombre, presentacion, descripcion, precio_venta,
  imagen, en_oferta, tags`. `proveedor: "LACA"`, `precio_venta` a plausible
  integer, `en_oferta` mixed true/false. No cost/margin keys.
- `public/img/laca/<id>.svg` — 3 lightweight placeholder images (simple SVG,
  no external fetch).
- `src/lib/types.ts` —
  - `export interface Product { ... }` mirroring RFC §2.4 exactly.
  - `export function isProduct(x: unknown): x is Product` — runtime guard used at
    the JSON parse boundary (checks each key + primitive types + `tags` array).
- `src/lib/products.ts` — server-only module (`import "server-only"`):
  - reads `public/data/products.json` with `node:fs` + `path` at build time
    (not `fetch`), `JSON.parse`, filters/validates rows through `isProduct`,
    throws if any row is invalid.
  - `getAllProducts(): Product[]` — sorted by `nombre` (localeCompare `es`).
  - `getProductById(id: string): Product | undefined`.
  - module-level memoization so the file is read once per build.
  - `formatARS(n: number): string` helper (Intl.NumberFormat `es-AR`, `ARS`,
    no decimals) — or place in a small `src/lib/format.ts` if preferred.

### UI

- `src/app/layout.tsx` — `<html lang="es">`, header with text wordmark
  "RenovArte" linking to `/`, `<main>` container (`max-w-6xl mx-auto px-4`),
  footer. `export const metadata` with title + description.
- `src/app/globals.css` — Tailwind directives + base body bg (beige token).
- `src/app/page.tsx` — Server Component. `getAllProducts()` → responsive grid
  (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) of `ProductCard`.
- `src/components/ProductCard.tsx` — props `{ product: Product }`. `next/link`
  to `/producto/${product.id}`, `next/image` (or plain `img` for SVG) with
  `alt={product.nombre}`, shows `nombre`, `presentacion`, `formatARS(precio_venta)`.
  Renders a small "Oferta" tag when `en_oferta` (styling only; full behavior is
  0005).
- `src/app/producto/[id]/page.tsx` —
  - `generateStaticParams()` → `getAllProducts().map(p => ({ id: p.id }))`.
  - `generateMetadata()` → per-product title.
  - page: `getProductById(params.id)`, `notFound()` if undefined; renders image,
    `categoria`, `nombre`, `presentacion`, `descripcion`, price, back link.
- `src/app/not-found.tsx` — simple 404 with link home.

### Scripts / config

- `tailwind.config.ts` — `theme.extend.colors.sage` + `.beige` scales
  (placeholder hex from RFC §2.1 "verde salvia / beige"; finalized in 0006).
- `vitest.config.ts` — include `tests/unit/**/*.test.ts`.
- `playwright.config.ts` — `testDir: tests/e2e`, `webServer` = `pnpm build &&
  pnpm start` on port 3000, single chromium project, plus a 390px viewport
  assertion in the test.
- `scripts/check-leak.mjs` — reads all files under `.next/` and `public/data/`,
  fails (exit 1) if any contains `/precio_costo|(?<![a-z])costo(?![a-z])|margen|
  margin_percent/i`. Prints offending file + match.
- `package.json` scripts: `dev`, `build`, `start`, `lint`,
  `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test`),
  `check:leak` (`node scripts/check-leak.mjs`).
- `.env.example` — documents `MARGIN_PERCENT_DEFAULT` / `MARGIN_PERCENT_ANTIAGE`
  with a comment: "no NEXT_PUBLIC_ prefix — ingest script only, never in Vercel".
- `.nvmrc` — current Node LTS.
- `README.md` — project summary, stack, `pnpm i` / `pnpm dev`, test commands,
  pointer to `specs/`, and the future update flow (CSV → `pnpm ingest` → push),
  linking 0002.

### Root housekeeping

- `.gitignore` extended (see Milestone 0): `.env*.local`, `data/raw/`,
  `data/private/`, plus Next defaults (`.next/`, `node_modules/`, coverage,
  Playwright artifacts).

## Tests

- `tests/unit/products.test.ts`:
  - `getAllProducts()` returns 3 products, sorted by `nombre`.
  - a crafted invalid row makes the loader throw (use a fixture, not the real
    file — e.g. export the validation fn and test it directly).
  - `getProductById` returns the match / `undefined`.
  - seed `products.json` keys are exactly the RFC §2.4 set (guards AC-3).
- `tests/e2e/catalog.spec.ts`:
  - home shows 3 cards, each with visible name + a `$`-prefixed price.
  - `body.scrollWidth` ≤ 390 at 390px viewport.
  - clicking the first card navigates to `/producto/...` and the `<h1>` matches
    the card name.
  - visiting `/producto/does-not-exist` shows the 404 content.

## Deploy

- New GitHub repo `renovarte-catalogo`, push `main`.
- Import into Vercel (framework auto-detected as Next.js, build `pnpm build`).
- No env vars needed in Vercel for this milestone.
- Confirm the deployment URL renders home + a detail page on a phone.

## Risks / notes

- `next/image` with local SVG can warn; use `unoptimized` for the placeholder
  images or plain `<img>` — revisit in 0006 with real assets.
- Keep the loader server-only so `node:fs` never lands in the client bundle
  (also protects AC-3).
