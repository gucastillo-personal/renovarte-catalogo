# 0007 — Precio de oferta · Tasks

## Schema

- [x] T1 — `src/lib/types.ts`: `Product` + `precio_regular?` / `descuento_pct?`;
  `REQUIRED_PRODUCT_KEYS` / `OPTIONAL_PRODUCT_KEYS` / `PRODUCT_KEYS`; `isProduct`
  valida opcionales + coherencia. **Check:** `pnpm typecheck`.
- [x] T2 — `tests/unit/types.test.ts`: casos de `isProduct` (opcionales OK;
  `descuento_pct` sin `precio_regular`; `precio_regular ≤ precio_venta`; rango).
  **Check:** `pnpm test`.

## Transformación

- [x] T3 — `scripts/lib/pricing.ts`: `buildPublicProduct(row, { margin,
  descuentoPct? })` arma `precio_regular` / `descuento_pct` en orden cuando hay
  descuento. **Check:** `pnpm typecheck`.
- [x] T4 — `scripts/lib/build-catalog.ts`: pasar `descuentoPct` a
  `buildPublicProduct`; borrar el post-proceso de `precio_venta`. **Check:**
  `pnpm test` (ajustar `buildCatalog offers` tests).
- [x] T5 — `pnpm transform` real: `511950004` gana `precio_regular: 27120`,
  `descuento_pct: 10`, `precio_venta: 24408`. `git diff` = solo ese producto.
  Idempotente. **Check:** manual + diff.

## UI

- [x] T6 — `src/components/ProductPrice.tsx` (`{ product, size? }`): sin oferta →
  un precio; con oferta → anterior tachado (`<s>` + sr-only) + final + chip
  `−N%`. **Check:** `pnpm build`.
- [x] T7 — `ProductCard.tsx` + `producto/[id]/page.tsx`: usar `<ProductPrice>`.
  **Check:** `pnpm build`, render correcto.
- [x] T8 — `OfferBadge.tsx`: prop `descuentoPct?` → `−N%` / `Oferta`; callers
  pasan `product.descuento_pct`. **Check:** `pnpm typecheck`.

## Tests + docs

- [x] T9 — Ajustar checks de claves a *superset* en `products.test.ts`,
  `serlaca-api.test.ts`, `ingest.test.ts`. `serlaca-api.test.ts`: el test de
  descuento chequea `precio_regular` / `descuento_pct`. **Check:** `pnpm test`.
- [x] T10 — `tests/e2e/catalog.spec.ts`: `511950004` en card y ficha → anterior
  tachado + `−10%` + final `24408`; producto sin oferta → un precio. **Check:**
  `pnpm test:e2e`.
- [x] T11 — `docs/rfc/0001-arquitectura-catalogo.md` §2.4: enmienda (campos
  opcionales de oferta). README / `docs/serlaca-api.md`: nota. **Check:** links.

## Cierre

- [x] T12 — `pnpm gate` verde.
- [x] T13 — `specs/README.md`: 0007 → Built; RF-05 → ampliado.
