# 0003 — Category filter · Plan

Checked against [`../constitution.md`](../constitution.md). 24 categorías reales
en el catálogo (Antiage, Labios, Uñas, Rostro, Correctores e Iluminadores,
Protección Solar, Dr. Enero, …).

## Slug

`categoria` (string libre, con acentos / espacios / puntos) → slug de URL, con
lookup inverso (no se "des-slugifica", se busca la categoría cuyo slug matchea).

`src/lib/category-slug.ts` (puro, client-safe):

```ts
export function slugifyCategoria(name: string): string {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // saca diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
// "Protección Solar" -> "proteccion-solar" ; "Dr. Enero" -> "dr-enero" ; "Uñas" -> "unas"
```

## `src/lib/products.ts` (server-only, ya existe)

Agregar:

- `getCategoryList(): { slug: string; nombre: string; count: number }[]` —
  distintas `categoria`, ordenadas por nombre (es), con su slug y conteo. Lanza
  si dos categorías colisionan en el mismo slug (guardia de build).
- `categoriaFromSlug(slug: string): string | undefined` — busca en
  `getCategoryList()`.
- `getProductsByCategoria(categoria: string): Product[]` — `getAllProducts()`
  filtrado (ya vienen ordenados por nombre).

## Componentes

`src/components/CategoryNav.tsx` — **Server Component** (solo links, sin estado):

```tsx
export function CategoryNav({ activeSlug }: { activeSlug?: string }) { … }
```

- Fila `flex flex-wrap gap-2` de "chips": `Todos` → `/`, y una por categoría →
  `/categoria/<slug>`.
- Chip activo: `aria-current="page"` + `bg-sage-600 text-beige-50`. Inactivo:
  `bg-beige-100 text-sage-700 hover:bg-beige-200`. `Todos` activo cuando
  `activeSlug` es undefined.
- `flex-wrap` (no `overflow-x`) → sin scroll horizontal a 390px (AC-4).

## Rutas

`src/app/categoria/[slug]/page.tsx`:

- `export const dynamicParams = false;`
- `generateStaticParams()` → `getCategoryList().map(c => ({ slug: c.slug }))`.
- `generateMetadata()` → `title: <categoria>`.
- Página (async, `await params`): `categoriaFromSlug(slug)` → `notFound()` si
  undefined; `getProductsByCategoria(categoria)` → `<CategoryNav activeSlug={slug} />`
  + `<h1>{categoria}</h1>` + `<p>{n} productos</p>` + grilla de `ProductCard`
  (reusa el mismo markup que `page.tsx`).

`src/app/page.tsx`:

- Insertar `<CategoryNav />` (sin `activeSlug`) arriba de la grilla.

`src/app/producto/[id]/page.tsx`:

- El chip de `product.categoria` pasa a ser `<Link href={/categoria/<slug>}>`
  (aprovecha el slug; scope "URL compartible por categoría").

## Grilla compartida

Para no duplicar el markup de la grilla entre `page.tsx` y `categoria/[slug]`,
extraer `src/components/ProductGrid.tsx`:

```tsx
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => <li key={p.id} className="flex"><ProductCard product={p} /></li>)}
    </ul>
  );
}
```

`page.tsx` y `categoria/[slug]/page.tsx` lo usan.

## Tests

- `tests/unit/category-slug.test.ts` — `slugifyCategoria`: acentos, espacios,
  `Dr. Enero`→`dr-enero`, `Uñas`→`unas`, sin guiones al borde, idempotente sobre
  su salida; y **todas las categorías reales de `products.json` dan slug único**.
- `tests/unit/products.test.ts` (extender) — `getCategoryList` (suma de `count`
  == total, slugs únicos), `categoriaFromSlug` (hit/miss, round-trip con
  `slugifyCategoria`), `getProductsByCategoria` (cuenta correcta, categoría
  inexistente → []).
- `tests/e2e/catalog.spec.ts` (extender):
  - home muestra `CategoryNav` con link "Todos" + varias categorías;
  - click en una categoría → URL `/categoria/<slug>`, `cards` tiene el conteo de
    esa categoría, el chip activo tiene `aria-current="page"`;
  - `/categoria/no-existe` → 404;
  - sin scroll horizontal a 390px en una página de categoría.

## Verificación

```
pnpm build            # ~24 páginas /categoria/* estáticas + las de producto
pnpm gate
```
Manual: abrir `/categoria/labios` en el teléfono, contar, volver con "Todos".
