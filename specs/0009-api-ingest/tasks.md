# 0009 — Ingesta en dos etapas · Tasks

Referencia: [`docs/serlaca-api.md`](../../docs/serlaca-api.md) · modelo: [`plan.md`](./plan.md).

**Status: hecho.** Gate verde (97 unit + 4 e2e). Corrida real: `pnpm ingest` bajó
434 crudos (37 págs), `pnpm transform` → 384 productos (50 profesional-exclusivos
filtrados), 24 categorías limpias.

**Modelo de precio corregido (post-review):** `price` de la API **es el costo**
de RenovArte (cuenta de distribuidora). `precio_venta = round(price × (1 +
MARGIN_PERCENT/100))`. Sin `SERLACA_DISCOUNT_PERCENT`. Se quitó la comparación
contra precio público de LACA (no está en los datos).

`products.json` sigue en la versión committeada (3 prods CSV) — falta que el
negocio cargue `MARGIN_PERCENT_DEFAULT` real y commitee el catálogo.

## Reorganización lib

- [x] T1 — Renombrar `scripts/lib/transform.ts` → `scripts/lib/pricing.ts`
  (`resolveMargin`, `computeSalePrice`, `buildPublicProduct`, `toProductsJson`).
  **Check:** `pnpm typecheck`.
- [x] T2 — Renombrar `scripts/lib/run.ts` → `scripts/lib/build-catalog.ts`; el
  export `ingest` pasa a llamarse `buildCatalog`. **Check:** `pnpm typecheck`.
- [x] T3 — `scripts/lib/categories.ts`: `cleanCategory()` + `RENAMES` editable.
  **Check:** `pnpm typecheck`.
- [x] T4 — `buildCatalog` aplica `cleanCategory(row.categoria)` a cada fila antes
  de agrupar por categoría. **Check:** `pnpm typecheck`.

## Etapa 1 — descarga cruda

- [x] T5 — `scripts/lib/sources/serlaca-api.ts`: agregar
  `fetchAllSerlacaPages(opts): Promise<{ dataObjects: unknown[]; meta }>` —
  paginación + chequeo de sobre solamente, **sin** `assertSerlacaProduct` ni
  filtros. Reusa la lógica de reintentos/timeout existente. **Check:** `pnpm typecheck`.
- [x] T6 — `scripts/ingest.ts`: reescribir como etapa 1 — `pnpm ingest` llama
  `fetchAllSerlacaPages`, arma `{ _meta, dataObjects }`, escribe
  `data/input/serlaca-raw.json`. `--source=csv` → mensaje que apunta a
  `pnpm transform --in`. **Check:** `pnpm ingest` sin `.env` → error claro de
  `SERLACA_API_KEY`.
- [x] T7 — `.gitignore`: `/data/input/*` + `!/data/input/serlaca-raw.sample.json`.
  **Check:** `git check-ignore data/input/serlaca-raw.json` matchea; el sample no.

## Etapa 2 — transformación

- [x] T8 — `scripts/lib/sources/serlaca-api.ts`: `rawToCostRows(dataObjects,
  { imageBase? }): { rows: CostRow[]; warnings }` — `assertSerlacaProduct` por
  item, **filtra** `professionalExclusive`, `mapToCostRow` (`precio_costo =
  price`). **Check:** `pnpm typecheck`.
- [x] T9 — `scripts/transform.ts` (`pnpm transform`): `--in` (default
  `data/input/serlaca-raw.json`); `.csv` → `readCsvCostRows`, si no →
  `rawToCostRows`; `buildCatalog(rows, { env, outPath: public/data/products.json })`.
  **Check:** `pnpm transform --in data/raw/serlaca_export.sample.csv` regenera
  products.json (fallback CSV, AC-8).
- [x] T10 — `package.json`: `"transform": "tsx scripts/transform.ts"`.
  `.env.example`: reagrupar por etapa. **Check:** `pnpm transform` existe.

## Datos de muestra

- [x] T11 — `data/input/serlaca-raw.sample.json` = `{ _meta, dataObjects }` con
  los 12 productos del fixture. **Check:** parsea; 2 con `professionalExclusive:true`.

## Tests

- [x] T12 — `tests/unit/categories.test.ts`: `cleanCategory` (punto final,
  colapso `Uñas`/`Uñas.`, renombres, acento). **Check:** `pnpm test`.
- [x] T13 — `tests/unit/serlaca-api.test.ts`: separar `fetchAllSerlacaPages`
  (crudo, incluye profesional; paginación; 401; 500+retry; envelope error) de
  `rawToCostRows` (filtra 2/12; mapea; drift). **Check:** `pnpm test`.
- [x] T14 — `tests/unit/ingest.test.ts`: imports → `pricing` / `build-catalog`;
  test de que `buildCatalog` limpia categorías. **Check:** `pnpm test`.
- [x] T15 — e2e sin red (quedó en `tests/unit/serlaca-api.test.ts`, describe
  "API source end to end"): `fetchAllSerlacaPages` stub → `rawToCostRows` →
  `buildCatalog` a tmp → `validateProducts` ok, sin claves de costo, categorías
  sin punto final, idempotente. **Check:** `pnpm test`.

## Integración

- [x] T16 — Correr real: `pnpm ingest` (con `.env`) → `data/input/serlaca-raw.json`;
  `pnpm transform` → `public/data/products.json`. Revisar conteo, categorías,
  una imagen que cargue. **Check:** gate completo verde.
- [x] T17 — `README.md` + `specs/README.md`: documentar las dos etapas; matriz.
  **Check:** links resuelven.
