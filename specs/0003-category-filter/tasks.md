# 0003 — Category filter · Tasks

## Dominio

- [x] T1 — `src/lib/category-slug.ts`: `slugifyCategoria(name): string` (puro,
  client-safe). **Check:** `pnpm typecheck`.
- [x] T2 — `src/lib/products.ts`: `getCategoryList()`, `categoriaFromSlug(slug)`,
  `getProductsByCategoria(categoria)`. `getCategoryList` lanza si dos categorías
  colisionan en el mismo slug. **Check:** `pnpm typecheck`.

## UI

- [x] T3 — `src/components/ProductGrid.tsx` — extraer la grilla; `page.tsx` la
  usa. **Check:** home renderiza igual que antes.
- [x] T4 — `src/components/CategoryNav.tsx` — chips `flex flex-wrap`, "Todos" +
  una por categoría, activo con `aria-current="page"` + estilo sage. **Check:**
  `pnpm typecheck`, sin warnings.
- [x] T5 — `src/app/page.tsx`: `<CategoryNav />` arriba de `<ProductGrid />`.
  **Check:** home muestra la barra.
- [x] T6 — `src/app/categoria/[slug]/page.tsx`: `dynamicParams = false`,
  `generateStaticParams` desde `getCategoryList()`, `generateMetadata`,
  `notFound()` en slug desconocido, `<CategoryNav activeSlug>` + `<h1>` +
  conteo + `<ProductGrid>`. **Check:** `/categoria/labios` renderiza; bogus → 404.
- [x] T7 — `src/app/producto/[id]/page.tsx`: el chip de categoría pasa a `<Link>`
  a `/categoria/<slug>`. **Check:** ficha linkea a su categoría.

## Tests

- [x] T8 — `tests/unit/category-slug.test.ts`: casos de `slugifyCategoria` +
  slugs únicos para las 24 categorías reales de `products.json`. **Check:**
  `pnpm test`.
- [x] T9 — `tests/unit/products.test.ts`: `getCategoryList` (suma == total,
  únicos), `categoriaFromSlug` (hit/miss/round-trip), `getProductsByCategoria`.
  **Check:** `pnpm test`.
- [x] T10 — `tests/e2e/catalog.spec.ts`: CategoryNav en home; click categoría →
  URL + conteo + `aria-current`; slug inexistente → 404; sin h-scroll @390px en
  página de categoría. **Check:** `pnpm test:e2e`.

## Cierre

- [x] T11 — `pnpm gate` verde (incluye build con ~24 páginas de categoría).
- [x] T12 — `specs/README.md`: 0003 → Built, matriz RF-02 → Built.
