# 0013 — UX de `ProductCard` y densidad de `ProductGrid` · Tasks

## Estimate

**Tamaño: M — 4 a 7 horas.** Los cambios de código en sí son chicos (dos
componentes, unas pocas clases de Tailwind, 4 ediciones de `docs/brand.md`),
comparable en volumen a la spec 0012 (S, 1.5–3h). Sube a M porque las e2e de
AC-7/AC-8 son un **patrón de test nuevo** en este repo — medir posiciones
reales del DOM (`getBoundingClientRect`, conteo de columnas por `top`
compartido) en vez de asertar clases o conteos de elementos como hace toda
la suite existente — y eso típicamente necesita más de una vuelta para
calibrar los viewports/umbrales exactos contra el `webServer` real de
Playwright (que reconstruye con `pnpm build` en cada corrida de
`test:e2e`, per `playwright.config.ts`).

**Top riesgos que podrían mover el estimate:**

1. **Calibrar los viewports de AC-7/AC-8 contra el comportamiento real del
   navegador** (scrollbar, redondeo de subpíxel) puede necesitar más de un
   ciclo de `pnpm test:e2e` — cada ciclo es lento porque el `webServer`
   corre `pnpm build` antes de servir. Mitigado en `plan.md` con asserts
   relativos y tolerancia en vez de igualdades exactas, pero sigue siendo el
   mayor riesgo de tiempo.
2. **Sintaxis de Tailwind arbitraria sin precedente exacto**
   (`grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))]`, función
   anidada de 3 niveles) — bajo riesgo de que no compile tal cual bajo
   Tailwind v4, pero si pasa, exige una vuelta extra para resolverlo con la
   alternativa de `@utility` documentada en `plan.md`.

## Tasks

- [x] **T1.** Editar `docs/brand.md`: las 4 ediciones que especifica `ux.md`
  §"Tokens nuevos" (extender uso de `beige-100` y `sage-800` en la tabla de
  paleta; nuevo bullet de padding en "Radios y espaciado"; nuevo bullet de
  tipografía en "Tipografía"). *Check:* lectura del diff — las 4 cadenas
  nuevas están presentes, nada más del archivo cambia; no afecta ningún
  gate (es solo doc).
- [x] **T2.** En `src/components/ProductCard.tsx`: cambiar `bg-white` →
  `bg-beige-100` en el `<Link>` exterior; `p-4` → `pt-3 px-3.5 pb-4` en el
  `<div>` de cuerpo; `font-medium` → `text-sm font-semibold` en el `<h2>`
  (sin tocar color/hover). *Check:* `pnpm build` sigue verde.
- [x] **T3.** Crear `tests/unit/product-card.test.tsx` (patrón
  `renderToStaticMarkup`, como `category-nav.test.tsx`): un test que
  renderiza `<ProductCard product={getAllProducts()[0]} />` y assert de que
  el HTML contiene `bg-beige-100`, `pt-3`, `px-3.5`, `pb-4`, `text-sm` y
  `font-semibold` en los elementos correctos (AC-1). *Check:* `pnpm test
  tests/unit/product-card.test.tsx` en verde.
- [x] **T4.** En el mismo archivo, agregar el test de contraste AA (mismo
  helper `relativeLuminance`/`contrastRatio` que ya existe en
  `category-nav.test.tsx`) para `sage-800`/`beige-100` y
  `sage-900`/`beige-100`, con `expect(ratio).toBeGreaterThanOrEqual(4.5)`
  para ambos pares y el valor calculado documentado en comentario (AC-2).
  *Check:* mismo comando, test en verde.
- [x] **T5.** En `src/components/ProductGrid.tsx`: cambiar `grid
  grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` →
  `grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-4`.
  *Check:* `pnpm build` sigue verde (confirma que Tailwind compila el valor
  arbitrario sin error); inspección visual rápida en `pnpm dev` de que el
  grid crece más allá de 3 columnas en una ventana ancha.
- [x] **T6.** En `tests/e2e/catalog.spec.ts`, agregar una sección "spec
  0013" con un helper local de columnas (agrupar `<li>` de `main ul` por
  `top` compartido con el primer elemento vía `getBoundingClientRect`) y un
  test que compara viewport `700px` vs. `1280px`: assert de que
  `1280px` resuelve más columnas que `700px`, y que `1280px` resuelve
  exactamente 5 (AC-7). *Check:* `pnpm test:e2e -g "columnas"` (o el nombre
  elegido) en verde.
- [x] **T7.** En el mismo archivo, agregar un helper local de no-overlap
  (bounding rect del `<h2>` de nombre vs. bounding rect del bloque de
  `ProductPrice` de la misma card) y un test a viewport `428px` (umbral de 2
  columnas ⇒ card ≈190px) sobre el producto de **nombre más largo real** en
  `products.json` (calculado dinámicamente del fixture, no el ejemplo de 33
  caracteres de `ux.md`): assert de que nombre y precio no se superponen y
  de que la card no genera overflow horizontal propio (AC-8). *Check:*
  `pnpm test:e2e -g "190"` (o el nombre elegido) en verde.
- [x] **T8.** Reusar el mismo helper de T7 en un test a viewport `390px`
  (mobile) sobre el mismo producto de nombre más largo real, verificando
  ausencia de overlap y de scroll horizontal propio de la card (AC-4, en
  conjunto con la e2e ya existente de "no horizontal scroll at 390px" que
  no se modifica). *Check:* `pnpm test:e2e -g "390"` en verde, junto con la
  e2e preexistente de scroll horizontal sin tocar.
- [x] **T9.** Correr la suite completa: `pnpm test` (unit) y `pnpm
  test:e2e` (Playwright) — en particular confirmar sin tocar nada más que
  seguían en verde las e2e de spec 0003 (filtro por categoría), spec 0004
  (búsqueda), spec 0005/0007 (`OfferBadge`/`ProductPrice` en oferta) y las
  de click/hover/focus de spec 0001 (AC-3, AC-5, AC-6, AC-9). *Check:* ambas
  suites en verde, cero test modificado fuera de los nuevos de T3/T4/T6/T7/T8.
- [x] **T10.** Correr el gate completo: `pnpm gate`. *Check:* verde (lint,
  build, typecheck, unit, `check:leak`, e2e).
- [x] **T11.** Actualizar `specs/README.md`: fila de la spec 0013 en el
  índice de features pasa de "Backlog" a "Built" (con el conteo de tests
  nuevo), y las menciones de 0013 en la matriz de trazabilidad (RF-01,
  RF-02, RF-03, RF-05, RNF-04, RNF-05) pasan de "(Backlog)" a reflejar el
  estado construido, incluyendo la nota sobre el contraste sub-AA
  pre-existente del precio tachado (dato de `ux.md`, no resuelto en este
  spec). *Check:* diff de `specs/README.md` revisado, sin menciones
  colgantes de "Backlog" para 0013.
