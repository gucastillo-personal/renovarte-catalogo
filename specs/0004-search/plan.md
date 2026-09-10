# 0004 — Name search · Plan

Checked against [`../constitution.md`](../constitution.md). Catálogo estático
(384 productos) ya en el HTML por SSG → el filtro es 100% cliente, sin red.

## Arquitectura

```
page.tsx (server)                    categoria/[slug]/page.tsx (server)
├── <CategoryNav/>                   ├── <CategoryNav activeSlug/>
└── <CatalogView products={all}/>    └── <CatalogView products={deCategoria}/>
        │  "use client"
        ├── <SearchBox value onChange/>
        ├── contador ("N de M" / "N resultados para …")
        └── <ProductGrid products={filtrados}/>  ó  estado vacío
```

`CatalogView` recibe la lista **ya cargada** (viene serializada en el HTML/flight
de SSG) y filtra en el navegador. No hay `fetch`, no cambia la URL. Search dentro
de una categoría (AC-5) sale gratis: la página de categoría le pasa sólo sus
productos.

## Archivos

- `src/lib/search.ts` (puro, client-safe):
  ```ts
  export function normalizeText(s: string): string   // NFD, sin diacríticos, lowercase, trim
  export function matchProducts(query: string, products: Product[]): Product[]
  //   query vacía -> todos ; si no -> substring de normalizeText(nombre)
  //   (tags como match secundario: normalizeText(tag).includes(q))
  ```
- `src/components/SearchBox.tsx` (`"use client"`): `<input>` controlado con
  `<label>` accesible, placeholder "Buscar producto…", botón "×" para limpiar
  cuando hay texto. Estilo sage/beige. Props `{ value, onChange }`.
- `src/components/CatalogView.tsx` (`"use client"`): `useState` para la query,
  `useDeferredValue` para la lista filtrada (mantiene el input fluido sin timers
  de debounce). Renderiza SearchBox + contador + (`ProductGrid` | estado vacío).
  Props `{ products: Product[] }`.
- `src/app/page.tsx` / `src/app/categoria/[slug]/page.tsx`: reemplazar el bloque
  de contador + `<ProductGrid>` por `<CatalogView products={…}/>`. El `<h1>`
  queda en la página server.

`ProductGrid` / `ProductCard` ya son client-safe (solo `next/image`, `next/link`,
`formatARS`) — se renderizan dentro de `CatalogView` sin cambios.

## Detalles

- **Contador**: sin query → "N productos"; con query → "N resultado(s) para
  «query»". Con categoría el N es dentro de la categoría.
- **Estado vacío**: query no vacía y 0 matches → mensaje
  ("No encontramos productos para «query».") + sugerencia de limpiar, en lugar de
  la grilla.
- **Sin debounce con timer**: `useDeferredValue` alcanza para 384 ítems
  (desviación menor del spec, justificada — filtrar es sub-ms).
- **`?q=` en la URL**: fuera de alcance por ahora (evita `useSearchParams` +
  Suspense). Anotado como futuro.
- **Payload**: `CatalogView` recibe `Product[]` completo → se serializa en el
  flight data de la home (~+500 KB, la home ya renderiza 384 cards server-side).
  Aceptado; la optimización real (paginación / lista slim) es aparte.

## Tests

- `tests/unit/search.test.ts` — `normalizeText` (acentos, mayúsculas, trim);
  `matchProducts`: substring en `nombre`, insensible a acentos y mayúsculas
  (query "cutanea" matchea "cutánea" y viceversa), query vacía → todos, sin
  match → `[]`, match por tag.
- `tests/e2e/catalog.spec.ts` (extender):
  - escribir un substring de un nombre real → la grilla se reduce; el contador
    baja; limpiar → vuelve al total; **la URL no cambia** (prueba client-side,
    AC-4);
  - escribir algo sin resultados → estado vacío visible, 0 cards (AC-3);
  - en `/categoria/<slug>`: buscar filtra dentro de esa categoría (AC-5).

## Verificación

```
pnpm gate
```
Manual: home, tipear "serum", ver la grilla filtrarse al instante sin recarga;
entrar a una categoría y buscar dentro.
