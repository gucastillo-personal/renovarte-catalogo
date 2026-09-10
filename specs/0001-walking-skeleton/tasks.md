# 0001 — Walking skeleton · Tasks

Work top to bottom. Each task ends in a checkable outcome.

Status: **code complete (T1–T14), deploy pending (T15–T16)**. Full gate green:
`pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm check:leak && pnpm test:e2e`.

## Scaffold

- [x] T1 — `pnpm create next-app` (App Router, TS, Tailwind, ESLint, `src/`,
  `@/*`) scaffolded in the scratchpad and merged into the repo root (kept
  `docs/`, `specs/`, `.git/`, the security `.gitignore`). Generated stack:
  Next 16.3.4, React 19.2, Tailwind v4 (CSS `@theme`, **no `tailwind.config.ts`**),
  ESLint 9 flat config. **Check:** ✅ `pnpm build` serves the app.
- [x] T2 — `tsconfig.json`: `strict` + `noUncheckedIndexedAccess`. Added
  `.nvmrc` (`v24.21.0`) and `package.json#engines.node` (`>=20.9.0`).
  **Check:** ✅ `pnpm typecheck` + `pnpm lint` clean.
- [x] T3 — Root `.gitignore` (written in Milestone 0) covers `.env*.local`,
  `/data/raw/`, `/data/private/`, `/.next/`, `/node_modules`, test artifacts.
  **Check:** ✅ `git status` clean of build/deps; `git check-ignore` confirms
  `data/raw|private` ignored, `data/reference` + `.env.example` tracked.

## Domain + data

- [x] T4 — `src/lib/types.ts`: `Product` (RFC §2.4 keys), `PRODUCT_KEYS`,
  `isProduct` guard, `validateProducts()` (throws + names bad row index).
  **Check:** ✅ typecheck + `tests/unit/types.test.ts` (13 cases).
- [x] T5 — `public/data/products.json`: 3 seed products (Antiage / Protección
  Solar / Corporales), only RFC §2.4 keys, `proveedor: "LACA"`, integer prices,
  `en_oferta` mix. `public/img/laca/<id>.svg` ×3. **Check:** ✅ parses; key-shape
  asserted in `tests/unit/products.test.ts`.
- [x] T6 — `src/lib/products.ts` (`import "server-only"`): memoized fs read +
  `validateProducts`; `getAllProducts()` sorted by `nombre` (es),
  `getProductById()`, `getCategories()` (for 0003). `formatARS` in
  `src/lib/format.ts`. **Check:** ✅ unit tests.

## UI

- [x] T7 — `src/app/layout.tsx`: `lang="es"`, header wordmark → `/`, `max-w-6xl`
  `<main>`, footer, `metadata` (title template). `globals.css`: Tailwind v4
  `@theme` with `sage`/`beige` scales, beige body bg. **Check:** ✅ shared shell
  on every route.
- [x] T8 — `src/components/ProductCard.tsx`: `next/link` to detail,
  `next/image` (`unoptimized`, SVG) with `alt`, name, presentation,
  `formatARS`, "Oferta" tag when `en_oferta`, focus-visible ring. **Check:** ✅
  build + lint, no warnings.
- [x] T9 — `src/app/page.tsx`: server component, `grid-cols-1 sm:2 lg:3`.
  **Check:** ✅ e2e: 3 cards; no h-scroll at 390px.
- [x] T10 — `src/app/producto/[id]/page.tsx`: `generateStaticParams`,
  `generateMetadata`, `dynamicParams = false`, `notFound()` on miss.
  `src/app/not-found.tsx`. **Check:** ✅ build lists 3 SSG detail pages; e2e
  bogus id → 404 + not-found UI. _Note: `next start` logs an internal
  `NoFallbackError` when serving the 404 for the dynamic route; response is a
  correct 404 with the not-found page. Revisit in a later spec._

## Safety + tests

- [x] T11 — `scripts/check-leak.mjs` + `check:leak`: recursively scans `.next/`
  (skips `cache/`) and `public/data/` text files for
  `precio_costo | precio_publico_laca | precio_lista_laca | margin_percent |
  \bmargen\b | \bcosto\b`, exits 1 naming the file+token. Caught a Spanish
  docstring in `types.ts` on first run → reworded to English. **Check:** ✅
  exits 0 after `pnpm build`.
- [x] T12 — Vitest: `vitest.config.mts` (`@` alias + `server-only` → stub at
  `tests/stubs/server-only.ts`). `tests/unit/{types,products,format}.test.ts` —
  18 tests. **Check:** ✅ `pnpm test` green.
- [x] T13 — Playwright: `playwright.config.ts` (`webServer: pnpm build && pnpm
  start --port 3100`, chromium). `tests/e2e/catalog.spec.ts` — 4 tests (grid
  count + name/price, no h-scroll @390px, card→detail h1, unknown id → 404).
  **Check:** ✅ `pnpm test:e2e` green (4 passed).

## Docs + deploy

- [x] T14 — `.env.example` (`MARGIN_PERCENT_*`, "no `NEXT_PUBLIC_`, ingest only,
  never in Vercel"). `README.md` (summary, stack, scripts, pre-deploy gate,
  update flow → 0002, business-security note). **Check:** ✅ `pnpm i && pnpm dev`
  from a clean state.
- [ ] T15 — Create GitHub repo, push `main`, import to Vercel (Next.js
  auto-detected, **no env vars**). **Check:** public URL renders home + one
  detail page on a phone. _Blocked on GitHub/Vercel account access._
- [ ] T16 — Record the deployed URL in `README.md`; set 0001 + its RF/RNF matrix
  rows in [`../README.md`](../README.md) to `Done`.
