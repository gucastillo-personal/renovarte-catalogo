# 0009 — Ingesta desde la API de serlaca (dos etapas)

**Status:** Reescrito 2026-09-10 — separación descarga / transformación.
**PRD:** RF-06, RF-07, RF-08; RNF-03
**RFC:** §1, §2.2 (enmendado), §2.3

## Why

El export CSV manual es frágil y lento. serlaca expone `Products/ReadProducts`
con API key. Además, mezclar **descarga** y **lógica de negocio** en un solo
script hace difícil re-transformar sin volver a pegarle a la API y ofusca qué es
dato crudo y qué es cálculo propio.

## Diseño: dos etapas

```
                 SERLACA_API_KEY, SERLACA_LACA_ID
                          │
   Etapa 1  ── pnpm ingest ──▶  data/input/serlaca-raw.json   (CRUDO, tal cual la API, paginado)
                                        │
                          MARGIN_PERCENT_*, SERLACA_IMAGE_BASE
                                        │
   Etapa 2  ── pnpm transform ──▶  public/data/products.json   (listo para la app)
```

- **Etapa 1 — `pnpm ingest`**: sólo baja. Recorre todas las páginas de la API,
  valida el sobre (`error`/`payload`) y escribe los `dataObjects` **sin tocar**
  en `data/input/serlaca-raw.json`, con un `_meta` (fecha, totales, páginas).
  No aplica descuento, margen, filtros ni limpieza. Config: `SERLACA_API_KEY`,
  `SERLACA_LACA_ID` (+ `SERLACA_CATEGORY_IDS` opcional).
- **Etapa 2 — `pnpm transform`**: toda la lógica. Lee `data/input/serlaca-raw.json`
  (o un CSV con `--in ruta.csv`), y:
  - **filtra** `professionalExclusive: true`;
  - `precio_costo = price` — el `price` de la API **es el costo** de RenovArte
    (cuenta de distribuidora, con IVA). Sin descuento.
  - `precio_venta = round(price × (1 + MARGIN_PERCENT/100))`;
  - `cleanCategory()` — saca el punto final, colapsa duplicados por typo
    (`"Uñas."`/`"Uñas"`), aplica un mapa de renombres editable;
  - `cleanName()` (Title Case si viene en mayúsculas), `htmlToText(detail)`,
    `formatSize(productSize)`, `imagen = SERLACA_IMAGE_BASE + imageURL`;
  - `validateProducts()` y escribe `public/data/products.json` determinístico.
  Config: `MARGIN_PERCENT_*`, `SERLACA_IMAGE_BASE`.

`data/input/serlaca-raw.json` está **gitignored** (es un cache: se re-baja con
`pnpm ingest`). Se commitea `data/input/serlaca-raw.sample.json` (~12 productos)
para tests y para poder correr `pnpm transform` sin API.

## Acceptance criteria

1. **AC-1 (descarga cruda):** `pnpm ingest` con credenciales válidas escribe
   `data/input/serlaca-raw.json` = `{ _meta, dataObjects: [...] }` donde cada
   `dataObject` es idéntico al de la API (mismos campos, sin transformar,
   incluidos los profesional-exclusivos). *Verificado por:* test de
   `fetchAllSerlacaPages` con `fetch` stub + corrida real (434 crudos).
2. **AC-2 (paginación / errores):** recorre `1..totalPages`; `error != null` o
   `payload` ausente → aborta sin escribir; 401 → mensaje de credencial;
   429/5xx → hasta 2 reintentos. *Verificado por:* tests con `fetch` stub.
3. **AC-3 (transformación · RF-06/08):** `pnpm transform` sobre el sample →
   `precio_venta = round(price × (1 + MARGIN_PERCENT/100))`; la salida **no**
   tiene `price`, `precio_costo` ni `margen`; `MARGIN_PERCENT_*` anda por env sin
   tocar código. *Verificado por:* Vitest.
4. **AC-4 (filtro):** los productos `professionalExclusive: true` del crudo **no**
   aparecen en `products.json`. *Verificado por:* Vitest sobre el sample (2 de 12
   excluidos).
5. **AC-5 (categorías limpias):** `"Uñas."` y `"Uñas"` colapsan a una sola;
   ninguna categoría de la salida termina en `.`; los renombres del mapa se
   aplican. *Verificado por:* Vitest de `cleanCategory` + assert sobre la salida.
6. **AC-6 (determinístico / RF-07):** `pnpm transform` dos veces sobre el mismo
   `data/input/` deja `git diff` vacío. *Verificado por:* test + manual.
7. **AC-7 (RNF-03):** `pnpm check:leak` verde; `SERLACA_API_KEY` no aparece en
   `data/input/`, `.next/`, `public/`, ni en logs; `data/input/serlaca-raw.json`
   gitignored. *Verificado por:* `check:leak` + `git check-ignore` + revisión.
8. **AC-8 (fallback CSV):** `pnpm transform --in data/raw/serlaca_export.sample.csv`
   produce el mismo resultado que la vieja ruta CSV de 0002. *Verificado por:*
   tests de orquestador de 0002 adaptados.

## Notas

- Node 24: `fetch` global, sin dep HTTP.
- `price` de la API es el costo de RenovArte (cuenta de distribuidora). No hay
  descuento; el `precio_venta` público sale de sumarle `MARGIN_PERCENT`.
- El crudo se gitignora por tamaño/ruido (se re-baja con `pnpm ingest`).
- La regla del PRD "precio propio por debajo del precio público de LACA" queda
  **en pausa**: con este modelo no tenemos el precio público en los datos. Se
  reabre spec 0008 (PDF) sólo si el negocio pide esa comparación.
- Corrida real OK: 434 crudos → 384 productos (50 profesional-exclusivos
  filtrados), 24 categorías limpias, imágenes desde `api.serlaca.com`.
