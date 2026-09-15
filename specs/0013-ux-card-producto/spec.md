# 0013 — Revisión de UX: cuerpo de `ProductCard` y densidad de columnas de `ProductGrid`

**Status:** Backlog
**PRD:** RF-01 (grilla con imagen, nombre, presentación y precio), RF-05
(marca visual de oferta), RNF-04 (responsive/usable en mobile), RNF-05
(portfolio-grade, documentado). **No agrega requisitos nuevos al PRD.**
Este spec no introduce una funcionalidad nueva: RF-01 ya exige que la
grilla muestre imagen, nombre, presentación y precio, y RNF-04 ya exige que
el sitio sea responsive/usable en mobile — ninguno de los dos fija cuántas
columnas debe tener la grilla ni cómo se resuelve ese número. Lo que falta
es una definición de UX explícita de **cómo** se ven esos elementos dentro
del cuerpo de la card (fondo, padding, tipografía) **y** de cómo la grilla
(`src/components/ProductGrid.tsx`) decide su número de columnas, que hoy no
existe con autoridad en ningún documento.

**Origen:** el CTO/CEO revisó el mismo mockup interactivo de UX de la spec
0011 (https://claude.ai/artifact/1AMG2PS4kzpQYrppfMFvQU — sección
"Catálogo", vista simplificada del bloque existente) y notó diferencias
entre cómo el mockup dibuja las cards de producto y la implementación
actual en `src/components/ProductCard.tsx`. Esta pregunta ya había quedado
explícitamente abierta (sin acceptance criteria) en
[`specs/0012-consistencia-chips-categoria/spec.md`](../0012-consistencia-chips-categoria/spec.md#preguntas-abiertas),
que resolvió los chips de categoría (sí había ahí una contradicción
objetiva con `docs/brand.md`) pero dejó la card de producto fuera de su
alcance a propósito.

**Amendment (2026-09-14) — alcance ampliado a `ProductGrid`:** el `ux-agent`
ya produjo una primera versión de `ux.md` (solo cuerpo de la card, dejando
explícitamente el layout de la grilla "sin cambios en `ProductGrid`" —
mismas 1/2/3 columnas fijas por breakpoint que hoy). Al revisarla, el
CTO/CEO pidió explícitamente que las cards sean **"más chicas"**, y aclaró
que se refiere a **más tarjetas por fila** (grid más denso en pantallas
anchas), no solo a compactar el padding interno de cada card dentro de las
columnas actuales — eso ya estaba cubierto por el alcance original y no
resuelve el pedido. Hoy `ProductGrid.tsx` usa columnas fijas por breakpoint
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, tope de 3 columnas sin
importar cuánto más ancha sea la pantalla); el mockup de referencia (mismo
artefacto de arriba, sección "Catálogo") usa en cambio un grid que agrega
columnas según el ancho disponible del contenedor
(`repeat(auto-fill, minmax(min(100%, 190px), 1fr))`), resultando en cards
más chicas y más por fila cuanto más ancha la pantalla. Esta amendment
extiende el alcance de este spec (que ya estaba en fase `Backlog`, sin
`plan.md` todavía) para cubrir también ese layout. **La `ux.md` existente
queda desactualizada en este punto** y el `ux-agent` debe revisarla de
nuevo con este alcance ampliado — eso es la siguiente fase, no la de este
`spec.md`.

## Problema

A diferencia de los chips de categoría (spec 0012), acá **no hay una
fuente de verdad con autoridad suficiente**. `docs/brand.md` solo fija
`rounded-lg` como radio para "cards" — nada sobre color de fondo, padding
o tipografía del cuerpo. El propio mockup de UX se autodeclara "vista
simplificada del bloque existente, no son datos reales": no fue construido
con intención de proponer un rediseño, así que tampoco alcanza por sí solo
como definición de diseño.

Diferencias observadas hoy entre el mockup y la implementación (insumo
para la revisión de UX, no conclusión de este spec):

- **Fondo:** mockup `beige-100`; implementación `bg-white`.
- **Padding del cuerpo:** mockup `.75rem .85rem .95rem` (asimétrico);
  implementación `p-4` (uniforme, 16px).
- **Nombre del producto:** mockup `font-weight: 600` y `font-size: .88rem`;
  implementación `font-medium` (500) sin tamaño explícito (hereda el
  tamaño base).
- **Precio:** mockup `font-size: .85rem; color: sage-600`; implementación
  usa el componente `ProductPrice` (tamaños y color propios, revisar si
  corresponde tocarlo o si el ajuste queda contenido en `ProductCard`).
- **Radio:** mockup `border-radius: 10px`; implementación `rounded-lg`
  (consistente con `brand.md` — diferencia de píxeles menor, no
  necesariamente accionable).
- **Imagen:** aspect-square en ambos, fondo `beige-100` del contenedor de
  imagen en la implementación — esto no cambia.

El CTO/CEO decidió explícitamente que esto se resuelve con una **revisión
de UX real**: ni se adopta el mockup a ciegas (no fue pensado como
propuesta autoritativa), ni se deja como está sin evaluar (el propio
CTO/CEO notó la diferencia y quiere una decisión consciente). Un
`ux-agent` diseña en serio el estilo del cuerpo de la card antes de que
haya cualquier cambio de código.

## Objetivo

Que el cuerpo de `ProductCard` (fondo, padding, tipografía del nombre y
tratamiento del precio) **y** el número de columnas de `ProductGrid`
tengan una definición de UX explícita y con autoridad — documentada en
`ux.md` — en vez de un valor implícito que nadie decidió a propósito,
resultando en cards visualmente más chicas y más tarjetas por fila en
pantallas anchas, preservando la legibilidad y el comportamiento que la
card y la grilla ya tienen hoy.

## Alcance

**In:**

- Definición de UX (a producir en la siguiente fase, en un `ux.md` de este
  mismo spec) para, dentro del cuerpo de `ProductCard` (el bloque debajo
  de la imagen):
  - Color de fondo.
  - Padding (simétrico o asimétrico).
  - Tipografía del nombre del producto (peso, tamaño).
  - Tratamiento visual del precio (delegable a un ajuste de `ProductPrice`
    si hiciera falta, o contenido en `ProductCard`).
- El mockup de UX (artefacto enlazado arriba) como **insumo de
  referencia**, no como fuente autoritativa — el `ux-agent` lo tiene en
  cuenta pero no está obligado a reproducirlo literalmente.
- Verificar que lo que ya funciona bien no se re-discute: radio
  (`rounded-lg`, ya alineado a `brand.md`) e imagen (aspect-square, fondo
  `beige-100` del contenedor) quedan como están.
- Contraste (AA) del nombre del producto y del precio sobre el fondo que
  se defina.
- Legibilidad del `OfferBadge` (spec 0005) sobre la imagen — no cambia de
  posición ni de tokens en este spec, pero cualquier cambio de fondo del
  cuerpo no debe extenderse a la zona de imagen donde vive el badge.
- Que el comportamiento de click/navegación de la card (toda la card es un
  `<Link>` a la ficha de producto, estados hover/focus-visible) no cambie.
- **Layout de la grilla (`src/components/ProductGrid.tsx`):** cómo se
  resuelve el número de columnas y el ancho mínimo de cada card. En
  concreto, el `ux-agent` define en `ux.md`:
  - Si el grid pasa de columnas fijas por breakpoint (`grid-cols-1
    sm:grid-cols-2 lg:grid-cols-3`) a un esquema que agrega columnas según
    el ancho disponible del contenedor (p. ej. `auto-fill`/`auto-fit` con
    `minmax`), y con qué ancho mínimo de card — sin fijar acá el valor
    concreto del `minmax` (eso lo decide `ux.md`, igual que ya delega los
    valores de fondo/padding/tipografía del cuerpo de la card).
  - El `gap` entre cards, si cambia.
  - Que el ancho mínimo elegido para la card no rompa la legibilidad del
    nombre/precio definida para el cuerpo (ver acceptance criteria).
- El mockup de UX (mismo artefacto de arriba) también como insumo de
  referencia para el layout de grilla — el valor de `minmax(...)` que usa
  (`190px`) es un dato de ese mockup simplificado, no una fuente
  autoritativa que el `ux-agent` esté obligado a reproducir literalmente.

**Out (explícito):**

- Radio de esquina de la card (`rounded-lg`) — ya coincide con
  `docs/brand.md`; la diferencia de `10px` del mockup se considera no
  accionable salvo que el `ux-agent` diga lo contrario explícitamente.
- Imagen del producto: proporción (`aspect-square`), fondo del contenedor
  de imagen (`beige-100`) — no se tocan.
- Chips de categoría / `CategoryNav` — eso es la spec 0012 (en fase de
  diseño en paralelo); este spec no la toca ni depende de ella.
- Ficha de detalle de producto (`/producto/[id]`) — `ProductCard` solo se
  usa hoy en la grilla (`ProductGrid`); esta revisión no alcanza a la
  página de detalle salvo que comparta explícitamente el mismo
  componente/estilo por decisión del `ux-agent`.
- Cualquier otro layout de página fuera de la grilla de catálogo (por
  ejemplo la disposición de `MissionSection` en la home, spec 0011, o el
  layout de la ficha de detalle) — solo `ProductGrid`/`ProductCard`.
- Lógica de datos, `products.json`, o cualquier campo del producto — esto
  es puramente visual.
- El comportamiento funcional de filtrado (`CategoryNav`, spec 0003) y
  búsqueda (`SearchBox`, spec 0004) — solo pueden verse afectados en la
  medida en que renderizan sobre el mismo `ProductGrid`; su lógica de
  filtrado/matching no se toca.
- Modificar `docs/brand.md` en esta fase de producto. Si el `ux-agent`
  decide fijar tokens nuevos para "card" (fondo/tipografía de cuerpo) o
  para el layout de grilla (ancho mínimo de card, `gap`), la actualización
  de `brand.md` es una decisión a tomar en la fase de diseño/plan, no algo
  que este `spec.md` prescriba de antemano.

## Acceptance criteria

1. **AC-1 (RF-01):** El cuerpo de la card (debajo de la imagen) usa el
   fondo, padding y tipografía del nombre que `ux.md` define — sin drift
   entre lo documentado y lo implementado. *Verificable por:* inspección
   visual/snapshot y un assert de estilo computado en test.
2. **AC-2 (RF-01, RNF-04):** El nombre del producto y el precio mantienen
   contraste AA para texto normal sobre el fondo que `ux.md` defina para
   el cuerpo de la card. *Verificable por:* cálculo de contraste (ratio) o
   herramienta de accesibilidad automatizada.
3. **AC-3 (RF-05):** Cuando el producto está en oferta, el `OfferBadge` (y
   el resto de la información de precio con descuento vía `ProductPrice`)
   sigue siendo legible con el mismo nivel de contraste que tiene hoy — el
   cambio de fondo/tipografía del cuerpo no degrada la legibilidad del
   indicador de oferta. *Verificable por:* los tests existentes de la spec
   0005/0007 sobre `OfferBadge`/`ProductPrice` siguen en verde, más un
   chequeo de contraste si `ux.md` toca el color del precio.
4. **AC-4 (RNF-04):** A 390px de ancho (grid a una sola columna, con o sin
   el layout basado en ancho de contenedor que defina `ux.md`), el nombre
   del producto (incluidos nombres largos) y el precio no se superponen,
   no generan scroll horizontal y respetan el padding que `ux.md` defina —
   sin importar si es simétrico o asimétrico. *Verificable por:* test
   e2e/responsive a ~390px sin overflow.
5. **AC-5 (RF-01):** El comportamiento de click/navegación de la card
   (toda la card navega a `/producto/[id]`, estados `hover`/
   `focus-visible` existentes) no cambia respecto de lo ya construido en
   la spec 0001. *Verificable por:* los tests existentes de navegación de
   card siguen pasando sin necesidad de tocar su intención.
6. **AC-6:** El radio de esquina (`rounded-lg`) y el tratamiento de la
   imagen (`aspect-square`, fondo `beige-100` del contenedor) no cambian
   como parte de este spec. *Verificable por:* los tests/snapshots
   existentes sobre esos dos aspectos siguen pasando sin modificación.
7. **AC-7 (RF-01, RNF-04):** El número de columnas de `ProductGrid` se
   resuelve en función del ancho disponible del contenedor (no solo de un
   número fijo de breakpoints `sm`/`lg`), de forma que en pantallas más
   anchas que el desktop de referencia actual entran más de 3 columnas.
   *Verificable por:* test responsive que compara el conteo de columnas (o
   el ancho de card resultante) en al menos dos anchos de viewport de
   escritorio distintos y verifica que un viewport más ancho produce más
   columnas, no el mismo tope fijo.
8. **AC-8 (RF-01, RNF-04):** El ancho mínimo de card que define `ux.md`
   para el grid no rompe la legibilidad del nombre del producto ni del
   precio definida en AC-1/AC-2 — a ese ancho mínimo, el nombre (incluidos
   nombres largos) y el precio siguen sin superponerse ni truncarse de
   forma no intencional. *Verificable por:* test/snapshot al ancho mínimo
   de card que `ux.md` especifique.
9. **AC-9 (RF-02, RF-03):** El cambio de layout de `ProductGrid` no
   modifica el comportamiento de filtrado por categoría (spec 0003) ni de
   búsqueda por texto (spec 0004): ambos siguen mostrando el subconjunto
   correcto de productos sobre la misma grilla. *Verificable por:* los
   tests existentes (unit + e2e) de las specs 0003 y 0004 siguen pasando
   sin necesidad de tocar su intención.

## Preguntas abiertas

1. **Definición visual concreta (color exacto, padding exacto, tamaño y
   peso de fuente del nombre, tratamiento del precio):** delegada por
   diseño a `ux.md`, que el `ux-agent` produce en la siguiente fase — este
   `spec.md` fija el objetivo y las restricciones (contraste, legibilidad
   del badge de oferta, sin cambio de comportamiento de click/navegación)
   pero no decide los valores.
2. **Valor concreto del ancho mínimo de card / `minmax(...)` del grid, y si
   se usa `auto-fill` o `auto-fit`:** igual que el punto anterior, delegado
   a `ux.md`. El mockup usa `190px` como referencia, pero el `ux-agent`
   puede elegir otro valor siempre que respete AC-8 (legibilidad de
   nombre/precio al ancho mínimo elegido). También queda a criterio de
   `ux.md` si el máximo de columnas en pantallas muy anchas se deja sin
   tope (`auto-fill`/`auto-fit` puro) o si conviene fijar un tope superior
   explícito — este `spec.md` no lo decide.
3. **La `ux.md` ya existente de este spec quedó desactualizada por esta
   amendment:** hoy dice explícitamente "grilla ... sin cambios en
   `ProductGrid`" (1/2/3 columnas fijas) para mobile y desktop. El
   `ux-agent` necesita revisarla de nuevo con el alcance ampliado (layout
   de grid incluido) antes de que este spec pueda pasar a `plan.md` — eso
   es la siguiente fase, no la de este `spec.md`.
4. **¿El precio necesita un ajuste puntual en `ProductCard` o alcanza con
   los tamaños que ya expone `ProductPrice` (`size="sm"`)?** El mockup
   sugiere `font-size: .85rem; color: sage-600` para el precio, distinto
   de lo que hoy renderiza `ProductPrice` en `size="sm"`. Si `ux.md`
   decide que el precio necesita otro tratamiento, corresponde evaluar en
   `plan.md` si eso es un ajuste dentro de `ProductCard` o un cambio de
   `ProductPrice` (que también se usa en la ficha de detalle con
   `size="lg"` — un cambio ahí no debería alterar sin querer esa vista).
5. **¿Corresponde formalizar los valores elegidos como tokens nuevos en
   `docs/brand.md`** (p. ej. un fondo de "card" documentado igual que ya
   existe para chips, o el ancho mínimo/`gap` del grid), para que una
   futura card o grid no vuelvan a divergir sin que haya una contradicción
   objetiva que lo detecte (como sí pasó con 0012)? Queda a criterio del
   `ux-agent`/`developer-agent` en la fase de diseño — este spec no lo
   decide.
