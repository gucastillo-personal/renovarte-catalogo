# 0001 — Walking skeleton

**Status:** Planned
**PRD:** RF-01, RF-04, RNF-01, RNF-02, RNF-03, RNF-04, RNF-05

## Why

Before building ingest, filters, search and branding, we want the whole pipeline
proven end to end: a Next.js catalog that reads a static JSON, renders a product
grid and per-product detail pages, and is deployed to a public URL on Vercel
free tier. This de-risks the deploy path and gives every later feature a running
app to extend.

## User value

- A client can open a public URL, see a grid of products (image, name,
  presentation, price), and tap one to read its detail.
- The developer has a documented, deployed repo to build on and to show.

## Scope

In:
- Next.js (App Router, TS, Tailwind) scaffold with strict TypeScript.
- `Product` type and a JSON loader with a runtime guard.
- 3 seed products in `public/data/products.json` (safe fields only) + placeholder
  images.
- Home page: product grid via `ProductCard`.
- Product detail page: statically generated per product, `notFound()` on unknown
  id.
- App shell: header with "RenovArte" wordmark placeholder, footer, mobile-first
  container, page metadata.
- Vitest + Playwright set up with the first tests.
- `check:leak` script.
- README and `.env.example`.
- First Vercel deploy.

Out (own specs): ingest script (0002), category filter (0003), search (0004),
offer badge beyond rendering the field (0005), real branding/logo/palette (0006),
margin report (0007), reference data (0008).

## Acceptance criteria

1. **AC-1 (RF-01):** The home page renders one card per product in
   `products.json`, each showing the product image, `nombre`, `presentacion` and
   `precio_venta` formatted as ARS currency. *Verified by:* Playwright
   `catalog.spec.ts` asserts 3 cards with visible name + price; manual view.
2. **AC-2 (RF-04):** Each product has a detail route `/producto/[id]` that is
   statically generated and shows image, `nombre`, `categoria`, `presentacion`,
   `descripcion` and price. An unknown id renders the 404 page. *Verified by:*
   Playwright clicks the first card and asserts the detail name matches; Vitest
   covers `getProductById` hit/miss; `pnpm build` output lists 3 detail pages.
3. **AC-3 (RNF-03):** `pnpm run check:leak` exits 0 — no `precio_costo`, `costo`,
   `margen`, `margin_percent` tokens in `.next/` or `public/data/`. The seed
   `products.json` contains only the RFC §2.4 keys. *Verified by:* the script in
   CI/local; a Vitest assertion on the seed file's keys.
4. **AC-4 (RNF-02):** `pnpm build` produces a fully static catalog (no server
   runtime data fetching); home and detail pages are prerendered. *Verified by:*
   build output shows `○ (Static)` / `●  (SSG)` for `/` and `/producto/[id]`.
5. **AC-5 (RNF-04):** At 390px width there is no horizontal scroll; the grid is
   single-column and readable; images have `alt` text. *Verified by:* Playwright
   viewport check for `document.body.scrollWidth <= viewport`; manual phone view.
6. **AC-6 (RNF-01/RNF-05):** The app is deployed to a public Vercel URL on the
   free tier, and the README lets a new dev install and run it with `pnpm i &&
   pnpm dev`. *Verified by:* opening the URL; following the README on a clean
   clone.

## Non-goals / explicitly deferred

- Real product data, real prices, real images.
- Any pricing/margin computation (0002 owns it).
- SEO polish, OG images, analytics (0006).
