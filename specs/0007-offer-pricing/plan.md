# 0007 — Precio de oferta · Plan

Checked against [`../constitution.md`](../constitution.md).

## Schema

`src/lib/types.ts`:

```ts
export interface Product {
  // … los 10 campos actuales (requeridos) …
  precio_regular?: number;  // solo si en_oferta con descuento
  descuento_pct?: number;   // entero 1..99
}

export const REQUIRED_PRODUCT_KEYS = [ /* los 10 de RFC §2.4 */ ] as const;
export const OPTIONAL_PRODUCT_KEYS = ["precio_regular", "descuento_pct"] as const;
export const PRODUCT_KEYS = [...REQUIRED_PRODUCT_KEYS, ...OPTIONAL_PRODUCT_KEYS];
```

`isProduct`:
- requeridas: como hoy.
- `precio_regular` / `descuento_pct`: si presentes → `number` finito.
- coherencia:
  - `descuento_pct` presente ⇔ `precio_regular` presente;
  - si presentes: `descuento_pct` en `1..99` y `precio_regular > precio_venta`.

`validateProducts`: sin cambios.

## Transformación

`scripts/lib/pricing.ts` — `buildPublicProduct(row, opts)`:

```ts
opts: { margin: number; descuentoPct?: number }

const base = computeSalePrice(row.precio_costo, opts.margin);
const d = opts.descuentoPct;
const hasDiscount = d != null && d > 0;
return {
  id, proveedor, categoria, nombre, presentacion, descripcion,
  precio_venta: hasDiscount ? Math.round(base * (1 - d / 100)) : base,
  ...(hasDiscount ? { precio_regular: base, descuento_pct: d } : {}),
  imagen: row.imagen,
  en_oferta: row.en_oferta,
  tags: row.tags,
};
```

El spread ubica `precio_regular` / `descuento_pct` justo después de
`precio_venta` → orden de claves estable (AC-6).

`scripts/lib/build-catalog.ts`:
- en el loop: `const descuentoPct = offers?.get(row.codigo.trim())?.descuentoPct;`
  → `buildPublicProduct(row, { margin, descuentoPct })`.
- **borrar** el bloque post-proceso que hoy hace
  `product.precio_venta = Math.round(product.precio_venta * (1 - descuentoPct/100))`.
- `en_oferta` se sigue seteando en `normalised` (unión con `offers`).

## UI

`src/components/ProductPrice.tsx` (server-safe, sin `"use client"`):

```tsx
export function ProductPrice({ product, size = "sm" }: { product: Product; size?: "sm" | "lg" }) {
  const onSale = product.precio_regular !== undefined;
  // sin oferta: <p className="font-semibold text-sage-900">{formatARS(precio_venta)}</p>
  // con oferta:
  //   <s> <span class="sr-only">Precio anterior:</span> {formatARS(precio_regular)} </s>
  //   <strong class="text-sage-900">{formatARS(precio_venta)}</strong>
  //   <span class="rounded bg-sage-600 px-1.5 text-xs text-beige-50">−{descuento_pct}%</span>
}
```

- `size="sm"` (card): apilado compacto, precio anterior chico.
- `size="lg"` (ficha): tipografía grande para el precio final.

`ProductCard.tsx`: el `<p>{formatARS(...)}</p>` → `<ProductPrice product={product} />`.
`src/app/producto/[id]/page.tsx`: el `<p className="text-3xl …">` → `<ProductPrice product={product} size="lg" />`.

`OfferBadge.tsx`: prop opcional `descuentoPct?: number` → texto `−N%` si viene,
si no `Oferta`. `ProductCard` / ficha pasan `product.descuento_pct`.

## RFC

`docs/rfc/0001-arquitectura-catalogo.md` §2.4: nota de enmienda — dos campos
opcionales (`precio_regular`, `descuento_pct`) para productos en oferta con
descuento; `precio_venta` sigue siendo el precio final.

## Tests

- `tests/unit/types.test.ts` — `isProduct`: opcionales OK; rechaza
  `descuento_pct` sin `precio_regular`, `precio_regular ≤ precio_venta`,
  `descuento_pct` fuera de `1..99`.
- `tests/unit/ingest.test.ts` — `buildPublicProduct` con `descuentoPct: 10`
  (base 120 → `precio_regular:120`, `descuento_pct:10`, `precio_venta:108`);
  sin `descuentoPct` → sin esos campos. Ajustar el test de "exactly PRODUCT_KEYS"
  a *superset check*. Ajustar `buildCatalog offers` (ya no post-procesa).
- `tests/unit/serlaca-api.test.ts` — el test de descuento chequea también
  `precio_regular` / `descuento_pct`; ajustar los checks de claves a superset.
- `tests/unit/products.test.ts` — el guard de "exactly RFC §2.4 keys" pasa a
  superset; "no cost/margin fields" sin cambios.
- `tests/e2e/catalog.spec.ts` — `511950004`: card y ficha muestran anterior
  tachado + `−10%` + final `24408`; un producto sin oferta muestra un solo
  precio.

## Verificación

```
pnpm transform      # 511950004 → precio_regular 27120, descuento_pct 10, precio_venta 24408
pnpm gate
git diff public/data/products.json   # solo 511950004 gana 2 claves
```
