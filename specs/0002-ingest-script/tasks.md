# 0002 — Ingest script · Tasks

Status: **done.** Full gate green (`typecheck · lint · test (66) · build ·
check:leak · test:e2e (4)`). `public/data/products.json` is now generated from
`data/raw/serlaca_export.sample.csv`; a second `pnpm ingest` leaves it unchanged.

Work top to bottom. Each task ends in a checkable outcome.

## Setup

- [x] T1 — Add deps: `pnpm add csv-parse dotenv` and `pnpm add -D tsx`. Add
  `"ingest": "tsx scripts/ingest.ts"` to `package.json` scripts. **Check:**
  `pnpm exec tsx --version` works.
- [x] T2 — `.gitignore`: replace `/data/raw/` with `/data/raw/*` and
  `!/data/raw/serlaca_export.sample.csv`. **Check:** `git check-ignore
  data/raw/serlaca_export.csv` matches; `git check-ignore
  data/raw/serlaca_export.sample.csv` exits non-zero (tracked).

## Sample data + assets

- [x] T3 — `data/raw/serlaca_export.sample.csv` with header
  `codigo,nombre,categoria,presentacion,descripcion,precio_costo,en_oferta,tags`
  and the 3 current products (same ids/names, fake costs, `|`-separated tags).
  **Check:** opens as valid CSV; 3 data rows.
- [x] T4 — `public/img/placeholder.svg` (neutral sage/beige placeholder).
  **Check:** file renders in a browser.

## Pure core

- [x] T5 — `scripts/lib/transform.ts`: `REQUIRED_COLUMNS`, `OPTIONAL_COLUMNS`,
  `validateColumns`, `parseARSNumber`, `parseBoolean`, `parseTags`,
  `resolveMargin`, `computeSalePrice`, `buildPublicProduct`, `toProductsJson`.
  Imports `PRODUCT_KEYS` / `Product` from `@/lib/types`. **Check:** `pnpm
  typecheck` passes.
- [x] T6 — `scripts/lib/images.ts`: `resolveImagePath(codigo, publicDir)` —
  ext priority `jpg,jpeg,webp,png,svg`, else `/img/placeholder.svg`. **Check:**
  typecheck; returns `/img/laca/545300004.svg` for the current asset.

## Orchestrator + CLI

- [x] T7 — `scripts/lib/run.ts`: `runIngest({csvPath,outPath,env,publicDir})` —
  parse + `validateColumns` (via `columns` hook) → per-row error collection
  (abort, no write) → build → `validateProducts` gate (reuse `@/lib/types`) →
  write `toProductsJson`. Returns `{ products, warnings }`. **Check:** typecheck.
- [x] T8 — `scripts/ingest.ts`: `dotenv` load `[".env.local",".env"]`, csvPath
  from `argv[2]` (default `data/raw/serlaca_export.csv`), call `runIngest`,
  print summary (`N productos, M en oferta`) + note "reporte de márgenes → spec
  0007", `process.exit(1)` on throw. **Check:** `pnpm ingest
  data/raw/serlaca_export.sample.csv` writes `public/data/products.json` and
  prints the summary.

## Tests

- [x] T9 — `tests/unit/ingest.test.ts` — pure functions: `validateColumns`,
  `parseARSNumber` (5 formats + throw), `parseBoolean`, `parseTags`,
  `resolveMargin` (default / override / bad value throws), `computeSalePrice`,
  `buildPublicProduct` (key set === `PRODUCT_KEYS`, no `costo`/`margen`),
  `toProductsJson` (sorted, trailing `\n`). **Check:** `pnpm test` green.
- [x] T10 — Same file, orchestrator via `os.tmpdir()`:
  - sample CSV → file written, re-parses through `validateProducts`, row count
    matches (AC-1);
  - run twice → byte-identical (AC-3);
  - `MARGIN_PERCENT_DEFAULT=35` shifts all prices; `MARGIN_PERCENT_ANTIAGE=10`
    overrides only Antiage (AC-2);
  - header missing `precio_costo` → throws, output file absent/unchanged (AC-4);
  - every written row's keys === `PRODUCT_KEYS` (AC-5).
  **Check:** `pnpm test` green.

## Integrate + verify

- [x] T11 — Run `pnpm ingest data/raw/serlaca_export.sample.csv` to regenerate
  `public/data/products.json`; commit the regenerated file. **Check:** second
  run leaves `git diff public/data/products.json` empty (idempotent).
- [x] T12 — Full gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build
  && pnpm check:leak && pnpm test:e2e`. **Check:** all green.
- [x] T13 — `README.md`: update the "Datos del catálogo" section — the public
  JSON flow is now real (`pnpm ingest`), report still pending (0007). Update
  [`../README.md`](../README.md) feature index + matrix: 0002 → Built for
  RF-06/07/08; RNF-03 note extended. **Check:** links resolve.
