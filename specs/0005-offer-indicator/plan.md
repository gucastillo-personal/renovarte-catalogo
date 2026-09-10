# 0005 — Offer indicator · Plan

Checked against [`../constitution.md`](../constitution.md). Hoy `en_oferta` es
siempre `false` (la API de serlaca no lo trae). Este spec agrega **(a)** una
fuente manual de ofertas y **(b)** el badge en la UI + `/ofertas`.

## Fuente de ofertas — `data/offers.json` (commiteado)

```json
{
  "codigos": {
    "511950004": { "descuento_pct": 10 }
  }
}
```

- `codigos` = objeto `{ productCode: { descuento_pct?: 0..100 } }`. `{}` = solo
  badge (sin cambio de precio); `{ "descuento_pct": 10 }` = 10% off `precio_venta`.
  También se acepta un array de strings (todos flag-only) y la forma en la raíz.
- RenovArte edita → `pnpm transform` → commit → push (mismo flujo que todo).
- **Sí se commitea** (no cae bajo ningún patrón de `.gitignore`).
- No hay "antes/ahora" con precio tachado (necesitaría guardar el precio previo
  en el schema) — sólo el badge + el `precio_venta` ya rebajado.

### `scripts/lib/offers.ts`

```ts
export interface Offer { descuentoPct: number }        // 0 = solo badge
export function loadOffers(filePath: string): Map<string, Offer>
//   archivo ausente            -> Map vacío (no es error)
//   { "codigos": {..} | [..] }  -> Map
//   {..} | [..] en la raíz      -> Map
//   descuento_pct fuera de 0..100 / forma rara -> throw con mensaje claro
```

### Integración en el pipeline (0009)

- `buildCatalog(rows, { env, outPath, offers? })` y
  `buildCatalogFromCsv({ …, offers? })` reciben el `Map`.
- Por fila: `en_oferta = offers?.has(codigo) ? true : row.en_oferta` (**unión**:
  no desmarca lo que la fuente trajera; para la API el `row` siempre es `false`).
- Si `descuentoPct > 0`: `precio_venta = round(precio_venta × (1 − pct/100))`
  (después de `buildPublicProduct`).
- `scripts/transform.ts` carga `data/offers.json` con `loadOffers`. Log:
  `N producto(s) en oferta`.

## UI

- `src/components/OfferBadge.tsx` — `<span>` con texto **"Oferta"** (no solo
  color), `bg-sage-600 text-beige-50` (contraste AA ~7:1). Reemplaza el `<span>`
  inline que ya hay en `ProductCard` y en la ficha.
- `src/lib/products.ts` — `getProductsOnOffer(): Product[]` = `load()` filtrado.
- `src/components/CategoryNav.tsx` — chip **"Ofertas"** → `/ofertas`, sólo si
  `getProductsOnOffer().length > 0`; activo cuando `activeSlug === "ofertas"`.
- `src/app/ofertas/page.tsx` — estática, `metadata`. Si hay ofertas →
  `<CategoryNav activeSlug="ofertas" />` + `<CatalogView products={ofertas} />`;
  si no → mensaje "No hay ofertas en este momento." + link a `/`.

## Tests

- `tests/unit/offers.test.ts` — `loadOffers`: array flag-only, objeto con `descuento_pct`, forma en la raíz,
  archivo ausente → Map vacío, JSON inválido / descuento fuera de rango → throw.
- `tests/unit/serlaca-api.test.ts` (o `ingest.test.ts`) — `buildCatalog` con
  `offers` marca `en_oferta` y aplica `descuentoPct` a `precio_venta` del
  producto correcto; sin `offers` → todos `false`, sin cambio de precio.
- `tests/unit/products.test.ts` — `getProductsOnOffer` devuelve exactamente los
  `en_oferta: true`.
- `tests/unit/*` render de `OfferBadge` / condición (Vitest, sin DOM: testear que
  `ProductCard` no lo pinta cuando `en_oferta:false` es cubierto por e2e; acá
  basta un test de que `OfferBadge` renderiza el texto "Oferta").
- `tests/e2e/catalog.spec.ts` — leer `products.json`, contar `en_oferta`:
  - si hay ofertas: badge visible en esas cards, chip "Ofertas" presente,
    `/ofertas` muestra ese conteo;
  - si no: sin badge en la grilla, sin chip "Ofertas", `/ofertas` muestra el
    mensaje de vacío.
  (Hoy corre la rama "sin ofertas"; cuando se llene `offers.json` corre la otra.)

## Verificación

```
echo '{"codigos":["<un-codigo-real>"]}' > data/offers.json && pnpm transform
pnpm gate
# quitar la entrada de data/offers.json si es solo prueba
```
