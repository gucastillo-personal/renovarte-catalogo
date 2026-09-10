# 0007 — Internal margin report

**Status:** Backlog
**PRD:** RF-09; RNF-03
**RFC:** §2.2, §2.4 (`data/private/margin-report.csv`)

## Why

The business needs an objective, auditable view of how RenovArte's own price
compares to LACA's public list price, to keep the margin competitive (always
below LACA's public price) and to decide pricing when LACA updates its list. This
data is strictly internal.

## User value

- The owner runs one command and gets a CSV comparing cost, applied margin, own
  sale price, LACA public price, and the absolute/percent difference per product.

## Scope

In:
- Extend `scripts/ingest.ts` (0002) to also emit
  `data/private/margin-report.csv` with columns exactly:
  `codigo,nombre,costo,margen_%,precio_venta,precio_publico_laca,diferencia_$,diferencia_%`.
- `precio_publico_laca` comes from `data/reference/laca_precios_publicos.json`
  (0008), keyed by `codigo`; rows without a reference are still written with
  blank LACA columns (or listed separately) — decide in `plan.md`.
- `diferencia_$ = precio_publico_laca - precio_venta`;
  `diferencia_% = diferencia_$ / precio_publico_laca * 100` (1 decimal).
- Optional: a "warnings" section / exit note when `precio_venta >=
  precio_publico_laca` (margin not competitive).

Out: any UI for the report; committing the report; charts.

## Acceptance criteria

1. **AC-1 (RF-09):** After `pnpm ingest`, `data/private/margin-report.csv` exists
   with the exact header above and one row per product that has cost data.
   *Verified by:* script test on fixtures.
2. **AC-2 (RNF-03):** `data/private/` is gitignored; `git status` never shows the
   report; `pnpm run check:leak` (which also scans built output) stays green; the
   report path is not under `public/` or `src/`. *Verified by:* `git
   check-ignore` assertion + `check:leak`.
3. **AC-3:** `diferencia_$` and `diferencia_%` are computed correctly for known
   fixtures, including the sign when own price exceeds LACA's. *Verified by:*
   Vitest.
4. **AC-4:** Products with no LACA reference are handled per the documented rule
   (not silently dropped). *Verified by:* fixture test.
