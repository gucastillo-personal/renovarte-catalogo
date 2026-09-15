# 0013 — UX de `ProductCard` y densidad de `ProductGrid` · Plan

Checked against [`../constitution.md`](../constitution.md). Cambio puramente
de presentación (CSS/Tailwind) sobre dos componentes ya construidos (spec
0001, extendidos por 0003/0004/0005/0007/0012); no toca datos, rutas ni
lógica de filtrado/búsqueda.

## Cambio de RFC: ninguno

No hay cambio de arquitectura, schema (`RFC §2.4`) ni invariante
cross-cutting. `ProductCard`/`ProductGrid` siguen recibiendo exactamente el
mismo `Product[]` que hoy (`getAllProducts`/`getProductsByCategoria`/
`matchProducts`, sin tocar); el cambio es solo qué clases de Tailwind usan
para pintar y para resolver el layout de columnas. No se toca
`docs/rfc/0001-arquitectura-catalogo.md`.

## Archivos a cambiar

### 1. `src/components/ProductCard.tsx`

- `<Link>` exterior: `bg-white` → `bg-beige-100` (es donde vive hoy el
  fondo del "cuerpo" — el `div` interno no tiene `bg` propio, per `ux.md`
  §"Fondo"). El resto de la clase (`border-beige-200`, `hover:shadow-md`,
  `focus-visible:*`) no cambia — AC-5.
- `<div>` del cuerpo: `p-4` → `pt-3 px-3.5 pb-4`.
- `<h2>`: `font-medium leading-snug text-sage-800 group-hover:text-sage-600`
  → `text-sm font-semibold leading-snug text-sage-800 group-hover:text-sage-600`
  (solo se agregan `text-sm` y se sube `font-medium`→`font-semibold`; color
  y hover no cambian).
- `<ProductPrice product={product} className="mt-auto pt-2" />`, imagen
  (`aspect-square bg-beige-100`) y `OfferBadge` — **sin tocar** (AC-3, AC-6).

### 2. `src/components/ProductGrid.tsx`

- `<ul>`: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` →
  `grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-4`.
- Forma elegida: valor arbitrario de Tailwind sobre la utilidad existente
  `grid-cols-*` (`grid-cols-[<css-value>]`), sin espacios dentro de los
  corchetes (`repeat(auto-fill,minmax(min(100%,190px),1fr))` es CSS válido
  sin espacios — no hace falta la sustitución `_` que sí necesitan los
  valores arbitrarios con espacios). Es el mismo patrón que ya usa el
  codebase para valores arbitrarios de una sola propiedad
  (`max-w-[22ch]`/`max-w-[28ch]` en `MissionSection.tsx`,
  `tracking-[0.2em]` citado en `docs/brand.md`) — no se introduce un CSS
  module ni un `style` inline nuevo, que sería una capa de complejidad sin
  beneficio para un valor que Tailwind ya expresa nativamente.
- `gap-4` se mantiene sin cambios (16px, ux.md confirma que no cambia).
- No cambia `<li className="flex">` ni el `.map` — cero cambio de JSX o de
  qué se itera (AC-9: la lista de productos que llega a `ProductGrid` no se
  toca, solo el CSS del contenedor).

### 3. `docs/brand.md` — 4 ediciones que pide `ux.md` §"Tokens nuevos"

1. Tabla de paleta, fila `beige-100`: extender uso a `"fondo del logo ·
   header · footer · superficies · cuerpo de ProductCard"`.
2. Tabla de paleta, fila `sage-800` (`"énfasis"`): agregar `"· nombre de
   producto en ProductCard"`.
3. Sección "Radios y espaciado": nuevo bullet documentando
   `pt-3 px-3.5 pb-4` (12px/14px/16px) del cuerpo de `ProductCard`, con la
   razón (menos aire arriba, más abajo por el `mt-auto` del precio) — texto
   ya redactado en `ux.md`, se copia tal cual.
4. Sección "Tipografía": nuevo bullet documentando `text-sm font-semibold`
   (14px/600) como tamaño del nombre en `ProductCard`, con la razón de
   jerarquía frente al precio — texto ya redactado en `ux.md`, se copia tal
   cual.

No se agrega ninguna entrada para el ancho mínimo/`gap` del grid porque
`ux.md` no lo pide explícitamente en su lista de "Tokens nuevos" (esa
sección solo cubre fondo/padding/tipografía del cuerpo de la card, no el
layout de `ProductGrid`) — se deja así, sin inventar alcance nuevo.

## Datos / shapes

Ninguno — `Product`, `products.json` y las funciones de `src/lib/products.ts`
no cambian. Es un spec puramente visual (ya excluido en `spec.md`, "Out").

## Cómo se testea cada acceptance criterion

| AC | Cómo se verifica |
|----|----|
| **AC-1** (fondo/padding/tipografía documentados = implementados) | Nuevo `tests/unit/product-card.test.tsx`: `renderToStaticMarkup(<ProductCard product={fixture} />)` (fixture = `getAllProducts()[0]`, patrón de `category-nav.test.tsx`/`offer-badge.test.tsx`) y asserts de substring sobre el HTML: el `<a>` exterior contiene `bg-beige-100`; el `<div>` de cuerpo contiene `pt-3`, `px-3.5` y `pb-4`; el `<h2>` contiene `text-sm` y `font-semibold`. |
| **AC-2** (contraste AA nombre/precio sobre `beige-100`) | Mismo archivo, mismo patrón de función pura `relativeLuminance`/`contrastRatio` que ya introdujo `tests/unit/category-nav.test.tsx` (AC-3 de spec 0012) — sobre los hex literales de `sage-800` (`#3d4436`), `sage-900` (`#333a2e`) y `beige-100` (`#f4f1e8`) tomados de `src/app/globals.css` (verificados: coinciden con `docs/brand.md`). Asserts `>= 4.5` (AA texto normal) para ambos pares; valores esperados documentados en el test (~8.9:1 y ~10.3:1, per cálculo de `ux.md`). No viola `no-stray-hex.test.ts` (mismo razonamiento que 0012: ese test solo escanea `src/components`/`src/app`, no `tests/`). |
| **AC-3** (no regresión de `OfferBadge`/precio de oferta) | No se toca `OfferBadge.tsx` ni `ProductPrice.tsx` — se verifica corriendo sin modificar `tests/unit/offer-badge.test.tsx` y los tests de `tests/e2e/catalog.spec.ts` de spec 0005/0007 ("offer badge + /ofertas reflect...", "card and detail show previous/final price...", "a flag-only offer...", "a product with no offer..."). El precio anterior tachado (`sage-500 text-xs`) no se toca por decisión explícita de `ux.md`/spec — se documenta en el reporte final el número ya calculado por `ux.md` (~3.0:1 sobre el nuevo `beige-100`, ya sub-AA hoy sobre `bg-white` a ~3.4:1) como dato para el CTO/CEO, sin agregar un assert nuevo que lo bloquee (sería fuera de alcance arreglarlo acá). |
| **AC-4** (390px, sin overlap/scroll horizontal) | La e2e existente `"home has no horizontal scroll at 390px (RNF-04)"` sigue sin tocarse y en verde. Se agrega una e2e nueva en `tests/e2e/catalog.spec.ts` (sección spec 0013) a 390px que toma el producto de **nombre más largo real** en `products.json` (calculado dinámicamente al cargar el fixture, mismo patrón que ya usa el archivo para `searchQuery`/`sampleCategoria` — no el nombre ilustrativo de 33 caracteres que usa `ux.md`, que no es el peor caso real: el catálogo actual tiene nombres de hasta 62 caracteres) y con `getBoundingClientRect()` en el navegador verifica (a) que el `<h2>` del nombre y el bloque de `ProductPrice` de esa card no se superponen verticalmente (`nombreRect.bottom <= precioRect.top`, con tolerancia de 1px) y (b) que la card no genera overflow horizontal propio (`card.scrollWidth <= card.clientWidth + 1`). |
| **AC-5** (click/hover/focus sin cambios) | Las e2e existentes que dependen del `<Link>` exterior (`"clicking a card opens its detail page (RF-04)"`, y todo lo que hace `page.locator('main ul > li a[href=...]')`) siguen sin tocarse y en verde — el diff de `ProductCard.tsx` no toca `href`, `group`, `hover:shadow-md` ni `focus-visible:*`, solo agrega/cambia clases de fondo/padding/tipografía. |
| **AC-6** (radio/imagen sin cambios) | Diff review: `rounded-lg`, `aspect-square`, `bg-beige-100` del contenedor de imagen y el bloque de `OfferBadge` no aparecen en el diff de `ProductCard.tsx`. Las e2e de oferta (spec 0005) que dependen de `getByTestId("offer-badge")` siguen en verde sin modificación. |
| **AC-7** (columnas por ancho de contenedor, no breakpoint fijo) | Nueva e2e: dos `page.setViewportSize` distintos (ver cálculo abajo) sobre `/`, midiendo columnas vía `getBoundingClientRect` (agrupar los `<li>` de `main ul` por su `top` — los que comparten el `top` del primer elemento están en la primera fila; su cantidad es el número de columnas), y assert de que el viewport más ancho resuelve **más** columnas que el más angosto (no el mismo tope). Se agrega también un assert de valor concreto en el viewport más ancho (5 columnas a `max-w-6xl`) como chequeo adicional, no solo relativo. |
| **AC-8** (legibilidad al ancho mínimo de card, 190px) | Nueva e2e: viewport calculado para caer justo en el umbral de 2 columnas (ver cálculo abajo — contenido de `main` en 396px ⇒ 2 columnas de ~190px cada una, el mínimo real que produce la fórmula `minmax(190px,1fr)`), reutilizando el mismo assert de no-overlap de nombre/precio de AC-4 (mismo helper de bounding rects) contra el producto de nombre más largo real. |
| **AC-9** (sin regresión de filtro/búsqueda) | `pnpm test` + `pnpm test:e2e` completos — en particular las e2e de spec 0003 (`"picking a category filters the grid..."`, conteo por categoría) y spec 0004 (`"typing filters the grid client-side..."`, `"a query with no matches..."`, `"search inside a category..."`) quedan **sin modificar** y deben seguir en verde. `spec.md` no pide un test nuevo para esto ("los tests existentes ... siguen pasando sin necesidad de tocar su intención") — correr la suite completa es la evidencia. |

### Cálculo de viewports para AC-7/AC-8 (no asumir, derivar)

`<main>` es `mx-auto w-full max-w-6xl px-4` (1152px máx, 16px de gutter por
lado ⇒ ancho de contenido = `min(viewport, 1152) - 32`). Con
`minmax(190px,1fr)` y `gap-4` (16px), el ancho de contenido necesario para
que entren `N` columnas es `N*190 + (N-1)*16`:

| N columnas | Ancho de contenido mínimo | Viewport equivalente (+32px de gutter) |
|---|---|---|
| 2 | 396px | 428px |
| 3 | 602px | 634px |
| 5 | 1014px (cabe en el máximo de contenido, 1120px) | ≥1152px |

- **AC-8:** viewport `428px` → contenido `396px` → exactamente 2 columnas de
  `(396-16)/2 = 190px` cada una — el mínimo real, no aproximado.
- **AC-7:** comparar viewport `700px` (contenido `668px` ⇒ 3 columnas, entre
  el umbral de 602 y el de 808 para 4) contra viewport `1280px` (contenido
  tope en `1120px` ⇒ 5 columnas, per el cálculo de `ux.md`) — assert
  `columnas(1280) > columnas(700)` y, como chequeo adicional,
  `columnas(1280) === 5`.

Esto responde directamente a la inquietud del orquestador: "contar
columnas" se hace con `getBoundingClientRect`/agrupación por `top`, no con
snapshots de clases CSS — las clases arbitrarias de Tailwind no garantizan
por sí solas el número de columnas resultante (depende del ancho real del
contenedor en runtime), así que el test tiene que medir el DOM renderizado.

## Riesgos / cosas a vigilar durante la implementación

1. **Matemática de los umbrales de `auto-fill`.** Si el viewport elegido
   para AC-8 no cae exactamente en el umbral (por redondeo de scrollbar,
   `overflow-y` del documento restando ~15px al viewport width real en
   Chromium, etc.), el test podría medir 190-192px en vez de exactamente
   190px, o fallar el conteo esperado de columnas en AC-7. Mitigación: los
   asserts de AC-7 son relativos (`más ancho > más angosto`) donde es
   posible, y el de AC-8 tolera un margen (`>= 185px && <= 200px` en vez de
   `=== 190`) en vez de una igualdad exacta frágil.
2. **El nombre más largo real (62 caracteres,
   "Fortificador Activo Gel Cejas y Pest c/Color x 10ml STYLE LASH") excede
   bastante el caso ilustrativo de `ux.md` (33 caracteres).** Estructuralmente
   no debería importar — el cuerpo es `flex-col` y el precio usa `mt-auto`,
   así que un nombre más largo solo agrega líneas de wrap y empuja el precio
   hacia abajo, nunca lo superpone — pero es la razón por la que AC-4/AC-8 se
   testean contra el nombre real más largo del fixture actual, no contra el
   ejemplo de `ux.md`, para no dar por sentada esa garantía sin medirla.
3. **Sintaxis de valor arbitrario `grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))]`
   sin precedente exacto en este codebase** (sí hay precedente de valores
   arbitrarios de una función simple, no de una función anidada de 3
   niveles). Se verifica con `pnpm build` (Tailwind v4 arbitraria + JIT) — si
   por algún motivo no compilara tal cual, la alternativa de respaldo
   (documentada acá, no a introducir salvo que haga falta) sería mover ese
   único valor a `globals.css` como una clase de utilidad nombrada
   (`@utility` de Tailwind v4) en vez de CSS module/inline style, para seguir
   sin salirse del sistema de utilidades del proyecto.
