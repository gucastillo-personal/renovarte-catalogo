# 0004 — Name search · Tasks

## Dominio

- [x] T1 — `src/lib/search.ts`: `normalizeText(s)` + `matchProducts(query,
  products)` (puros, client-safe). **Check:** `pnpm typecheck`.

## UI

- [x] T2 — `src/components/SearchBox.tsx` (`"use client"`): input controlado con
  `<label>`, placeholder, botón limpiar. Props `{ value, onChange }`. **Check:**
  `pnpm typecheck`, sin warnings de lint.
- [x] T3 — `src/components/CatalogView.tsx` (`"use client"`): query en `useState`,
  `useDeferredValue` para la lista filtrada; SearchBox + contador + (`ProductGrid`
  | estado vacío). Props `{ products }`. **Check:** `pnpm typecheck`.
- [x] T4 — `src/app/page.tsx`: `<CategoryNav />` + `<CatalogView products={getAllProducts()} />`
  (saca el contador/grilla inline). **Check:** home filtra al tipear.
- [x] T5 — `src/app/categoria/[slug]/page.tsx`: `<CatalogView products={getProductsByCategoria(categoria)} />`.
  **Check:** buscar en `/categoria/labios` filtra dentro de Labios.

## Tests

- [x] T6 — `tests/unit/search.test.ts`: `normalizeText` (acentos/mayúsculas/trim);
  `matchProducts` (substring, insensible a acentos y caso en ambos sentidos,
  query vacía → todos, sin match → [], match por tag). **Check:** `pnpm test`.
- [x] T7 — `tests/e2e/catalog.spec.ts`: tipear substring real → grilla se reduce
  + contador baja + URL sin cambios; limpiar → total; sin resultados → estado
  vacío + 0 cards; en `/categoria/<slug>` filtra dentro de la categoría.
  **Check:** `pnpm test:e2e`.

## Cierre

- [x] T8 — `pnpm gate` verde.
- [x] T9 — `specs/README.md`: 0004 → Built; matriz RF-03 → Built.
