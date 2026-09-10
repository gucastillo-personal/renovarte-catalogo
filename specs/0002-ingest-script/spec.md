# 0002 — Ingest script

**Status:** Backlog
**PRD:** RF-06, RF-07, RF-08; RNF-03
**RFC:** §2.2, §2.3, §2.6

## Why

Phase 1 has no admin UI. The catalog is refreshed by running one local script
that turns the serlaca cost CSV into the public `products.json`, applying
RenovArte's own margin. Cost and margin must never leak into the output.

## User value

- The admin downloads the serlaca CSV, runs `pnpm ingest`, commits, pushes — the
  live catalog reflects new products/prices in under 15 minutes (PRD §7).

## Scope

In:
- `scripts/ingest.ts` run via `pnpm ingest` (tsx), `import "dotenv/config"`.
- Read `data/raw/serlaca_export.csv` with `csv-parse/sync`.
- **Validate expected columns** up front (`codigo`, `nombre`, `categoria`,
  `presentacion`, `precio_costo`, ...); abort with a clear message if the shape
  changed (Risk in PRD §8).
- Margin: `MARGIN_PERCENT_DEFAULT` (fallback 20) + optional
  `MARGIN_PERCENT_<CATEGORY>` override (category upper-cased, spaces → `_`).
  No `NEXT_PUBLIC_` prefix.
- `precio_venta = Math.round(costo * (1 + margin / 100))`.
- Write `public/data/products.json` with **only** RFC §2.4 public keys.
- Idempotent: same input + env ⇒ byte-identical output (stable key order, sorted
  by `id` or `nombre`).

Out: the internal margin report CSV (→ 0007); reference-data digitization (→ 0008);
fetching from the serlaca API directly (manual CSV export stays the boundary).

## Acceptance criteria

1. **AC-1 (RF-06):** Given a fixture CSV row with `precio_costo`, the output
   `precio_venta` equals `round(costo * (1 + margin/100))` and the output object
   has no `costo` / `precio_costo` / `margen` key. *Verified by:* Vitest on the
   pure `buildProduct` / `computePrice` functions.
2. **AC-2 (RF-08):** Setting `MARGIN_PERCENT_DEFAULT=35` (no code change) changes
   every non-overridden product's price accordingly;
   `MARGIN_PERCENT_ANTIAGE=30` overrides only `Antiage` rows. *Verified by:*
   Vitest running the resolver with a mocked `process.env`.
3. **AC-3 (RF-07):** `pnpm ingest` on a sample CSV regenerates
   `public/data/products.json`; running it twice with unchanged inputs leaves the
   file unchanged (`git diff` empty). *Verified by:* a script test / manual.
4. **AC-4 (column drift):** A CSV missing `precio_costo` (or with a renamed
   column) makes the script exit non-zero and name the missing column; it does
   **not** write a partial file. *Verified by:* Vitest / CLI test with a broken
   fixture.
5. **AC-5 (RNF-03):** After ingest, `pnpm run check:leak` still passes and the
   output JSON keys are exactly the RFC §2.4 set. *Verified by:* `check:leak` +
   key assertion.

## Notes

- `data/raw/` is gitignored — commit a tiny `data/raw/serlaca_export.sample.csv`
  (fake numbers) for tests and onboarding.
- Keep `computePrice`, `resolveMargin`, `validateColumns`, `buildPublicProduct`
  as pure exported functions so they are unit-testable without filesystem.
