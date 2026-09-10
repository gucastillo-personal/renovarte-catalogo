# 0005 — Offer indicator · Tasks

## Fuente de ofertas

- [x] T1 — `data/offers.json` = `{ "codigos": [] }` (commiteado).
  `scripts/lib/offers.ts`: `loadOfferCodes(filePath): Set<string>` (ausente → Set
  vacío; `{codigos:[]}` o array; forma inesperada → throw). **Check:** `pnpm typecheck`.
- [x] T2 — `scripts/lib/build-catalog.ts`: `buildCatalog` y `buildCatalogFromCsv`
  aceptan `offerCodes?: Set<string>`; por fila
  `en_oferta = offerCodes?.has(codigo) || row.en_oferta`. **Check:** `pnpm typecheck`.
- [x] T3 — `scripts/transform.ts`: cargar `data/offers.json` y pasarlo; log
  `N en oferta`. **Check:** `pnpm transform` corre y reporta 0 en oferta.

## UI

- [x] T4 — `src/components/OfferBadge.tsx` — `<span>Oferta</span>`, sage/beige,
  AA. **Check:** `pnpm typecheck`.
- [x] T5 — `ProductCard.tsx` + `producto/[id]/page.tsx`: usar `<OfferBadge/>` en
  lugar del `<span>` inline. **Check:** `pnpm build`.
- [x] T6 — `src/lib/products.ts`: `getProductsOnOffer()`. **Check:** `pnpm typecheck`.
- [x] T7 — `src/components/CategoryNav.tsx`: chip "Ofertas" → `/ofertas` sólo si
  hay ofertas; activo con `activeSlug === "ofertas"`. **Check:** `pnpm build`.
- [x] T8 — `src/app/ofertas/page.tsx` — estática, `metadata`; con ofertas →
  `<CategoryNav activeSlug="ofertas"/>` + `<CatalogView>`, si no → mensaje de
  vacío + link a `/`. **Check:** `/ofertas` renderiza (mensaje de vacío hoy).

## Tests

- [x] T9 — `tests/unit/offers.test.ts`: `loadOfferCodes` (4 casos).
- [x] T10 — `tests/unit/serlaca-api.test.ts`: `buildCatalog` con/ sin
  `offerCodes`. `tests/unit/products.test.ts`: `getProductsOnOffer`.
- [x] T11 — `tests/e2e/catalog.spec.ts`: rama con/ sin ofertas (badge, chip,
  `/ofertas`). **Check:** `pnpm test:e2e`.

## Cierre

- [x] T12 — `pnpm gate` verde.
- [x] T13 — README + `docs/serlaca-api.md`: documentar `data/offers.json`.
  `specs/README.md`: 0005 → Built; matriz RF-05 → Built.
