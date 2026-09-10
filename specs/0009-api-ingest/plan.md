# 0009 — Ingesta en dos etapas · Plan

Referencia de la API: [`docs/serlaca-api.md`](../../docs/serlaca-api.md).
Decisiones: descuento sobre `price` (con IVA); `professionalExclusive` excluido;
imágenes por URL remota; `data/input/` gitignored + sample commiteado; limpieza
de categorías en la etapa 2.

## Estructura de archivos

```
scripts/
├── ingest.ts                 # ETAPA 1 — pnpm ingest : API cruda → data/input/serlaca-raw.json
├── transform.ts              # ETAPA 2 — pnpm transform : data/input/ (o CSV) → public/data/products.json
└── lib/
    ├── cost-row.ts           # (igual) CostRow
    ├── html.ts               # (igual) htmlToText, cleanName, formatSize
    ├── categories.ts         # NUEVO  cleanCategory()
    ├── pricing.ts            # RENOMBRE de transform.ts: resolveMargin, computeSalePrice, buildPublicProduct, toProductsJson
    ├── images.ts             # (igual) resolveImagePath, PLACEHOLDER_IMAGE
    ├── build-catalog.ts      # RENOMBRE de run.ts: buildCatalog(rows, {env,outPath}) — núcleo; aplica cleanCategory
    └── sources/
        ├── serlaca-api.ts    # fetchAllSerlacaPages() [E1 crudo] · rawToCostRows() + mapToCostRow() [E2] · assertSerlacaProduct()
        └── csv.ts            # (igual) readCsvCostRows()

data/input/
├── serlaca-raw.json          # gitignored (cache)
└── serlaca-raw.sample.json   # commiteado (~12 productos, del fixture)
```

## Etapa 1 — `scripts/ingest.ts` (`pnpm ingest`)

- `fetchAllSerlacaPages({ apiKey, lacaId, categoryIds, fetchImpl?, timeoutMs?, maxRetries?, retryBaseMs? })`
  → `{ dataObjects: unknown[]; meta: { totalItems: number; pages: number } }`.
  - Recorre `currentPage` 1..`totalPages`. Acumula `payload.dataObjects` **sin
    tocar** (ni siquiera `assertSerlacaProduct` — eso es validación de negocio,
    va en E2). Chequea sólo el sobre: `error != null` → throw; `payload` /
    `dataObjects` ausentes → throw.
  - 401/403 → throw credencial. 429/5xx → reintentos (`retryBaseMs`, x2).
    Timeout con `AbortController`.
- El script escribe:
  ```json
  { "_meta": { "fetchedAt": "<ISO>", "source": "serlaca-api",
               "totalItems": 384, "pages": 32, "categoryIds": [] },
    "dataObjects": [ /* crudo */ ] }
  ```
  en `data/input/serlaca-raw.json` (pretty, `\n` final).
- Config: `SERLACA_API_KEY`, `SERLACA_LACA_ID`, `SERLACA_CATEGORY_IDS?`.
  **No** lee descuento ni margen.
- `pnpm ingest --source=csv …` → mensaje: "el CSV ya es el crudo; usá
  `pnpm transform --in <ruta.csv>`".

## Etapa 2 — `scripts/transform.ts` (`pnpm transform [--in <ruta>]`)

- `--in` default `data/input/serlaca-raw.json`. Si la ruta termina en `.csv` →
  adaptador CSV; si no → adaptador API-crudo.
- Adaptador API-crudo: `rawToCostRows(dataObjects, { imageBase? })`
  → `{ rows: CostRow[]; warnings: string[] }`:
  - `assertSerlacaProduct` por item (drift → throw nombrando el campo);
  - **filtra** `professionalExclusive === true` (cuenta → warning);
  - `mapToCostRow`: `precio_costo = price` (el `price` de la API **es** el costo
    de RenovArte, cuenta de distribuidora, con IVA), `cleanName`, `htmlToText`,
    `formatSize`, `imagen` remota o placeholder. (`cleanCategory` en el núcleo.)
- Adaptador CSV: `readCsvCostRows` (igual).
- Núcleo `buildCatalog(rows, { env, outPath })` (ex `run.ts#ingest`):
  - `row.categoria = cleanCategory(row.categoria)` para cada fila **antes** de
    agrupar;
  - margen por categoría (`resolveMargin`), `buildPublicProduct`
    (`precio_venta = round(precio_costo × (1 + margen/100))`);
  - `validateProducts`, `toProductsJson` → `public/data/products.json`.
- Config: `MARGIN_PERCENT_*`, `SERLACA_IMAGE_BASE`.

## `scripts/lib/categories.ts`

```ts
// clave = categoría ya sin punto final, en minúsculas
const RENAMES: Record<string, string> = {
  "proteccion solar": "Protección Solar",            // acento faltante
  "correctores / iluminadores": "Correctores e Iluminadores",
  "hidratación-humectación-tonificación": "Hidratación",
  "paletas / pincelería / artístico": "Pinceles y Paletas",
  "pre bases / bases / polvos / rubores / fijadores / preparación piel": "Rostro",
  "dermatocosmética dr. enero": "Dr. Enero",
  // ↑ editable a gusto del negocio
};

export function cleanCategory(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ").replace(/[.\s]+$/u, "");
  return RENAMES[trimmed.toLowerCase()] ?? trimmed;
}
```

## `.gitignore`

```
/data/input/*
!/data/input/serlaca-raw.sample.json
```

## `.env.example`

Reagrupar: `SERLACA_API_KEY` / `SERLACA_LACA_ID` / `SERLACA_CATEGORY_IDS` bajo
"etapa 1 (pnpm ingest)"; `SERLACA_IMAGE_BASE` / `MARGIN_PERCENT_*` bajo
"etapa 2 (pnpm transform)". (No hay `SERLACA_DISCOUNT_PERCENT`.)

## Tests

- `tests/unit/categories.test.ts` — `cleanCategory`: `"Uñas."`→`"Uñas"`,
  colapso, sin punto final, renombres, acento de "Proteccion Solar.".
- `tests/unit/serlaca-api.test.ts` — dividir:
  - `fetchAllSerlacaPages` (E1): paginación acumula crudo **incluyendo**
    profesional-exclusivos; `error` envelope / 401 / 500+retry; devuelve
    `dataObjects` sin transformar.
  - `rawToCostRows` (E2): filtra profesional (2/12), `mapToCostRow` mapea bien,
    drift de campo → throw.
- `tests/unit/ingest.test.ts` → renombrar imports a `pricing` / `build-catalog`;
  cubre `buildCatalog` + `readCsvCostRows` + helpers CSV. Añadir: `buildCatalog`
  aplica `cleanCategory` (fila con `"X."` → producto con `"X"`).
- `tests/unit/transform-e2e.test.ts` — lee `data/input/serlaca-raw.sample.json`
  → `rawToCostRows` → `buildCatalog` a tmp → `validateProducts` ok, sin claves de
  costo, categorías sin punto, idempotente en 2ª corrida.
- `tests/unit/html.test.ts` — igual.

## `data/input/serlaca-raw.sample.json`

`{ "_meta": { "source": "serlaca-api", "sample": true, "totalItems": 12, "pages": 1 },
   "dataObjects": [ … los 12 de tests/fixtures/serlaca-api-response.json … ] }`

## Verificación

```
pnpm ingest                                   # baja crudo (usa .env)
pnpm transform                                # genera products.json
pnpm transform                                # 2ª vez → git diff vacío
pnpm transform --in data/raw/serlaca_export.sample.csv   # fallback CSV
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm check:leak && pnpm test:e2e
git check-ignore data/input/serlaca-raw.json  # ignorado
grep -ri "SERLACA_API_KEY" data/input .next public/data   # vacío
```

## Impacto

- RFC §2.2: la enmienda ya contempla API vs CSV; agregar nota de las dos etapas.
- `price` de la API es el **costo** de RenovArte (cuenta de distribuidora), no el
  precio público. La regla del PRD "por debajo del público de LACA" queda en
  pausa; 0007/0008 necesitan otra fuente para el precio público si se retoman.
