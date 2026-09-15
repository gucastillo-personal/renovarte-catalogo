# 0013 — UX: cuerpo de `ProductCard` y densidad de `ProductGrid`

**Mockup:** https://claude.ai/artifact/GDyrtm7ifZwQ3XN9Rmpei4 (prototipo de
revisión interactivo — cubre el cuerpo de la card (comparación sin oferta,
con oferta, ancho 390px, tabla de contraste) **y** una demo en vivo del
grid nuevo (sección 4: contenedor redimensionable de 190px a 1152px con
conteo de columnas en tiempo real sobre cards reales, más una card fijada
a exactamente 190px con el nombre más largo del catálogo para verificar
legibilidad en el caso límite). Aprobado por el CTO/CEO 2026-09-15. No es
la implementación final.)

Este documento resuelve las preguntas abiertas de `spec.md`: valores
concretos del cuerpo de la card, si `ProductPrice` necesita un ajuste, qué
tokens nuevos formalizar en `docs/brand.md`, **y (amendment 2026-09-14) el
reemplazo del layout de columnas fijas de `ProductGrid.tsx` por un grid que
agrega columnas según el ancho del contenedor**. Cubre exactamente el
alcance ampliado del spec — radio, imagen, `OfferBadge` (posición/tokens) y
comportamiento de click/hover/focus **no cambian**; lógica de filtrado
(`CategoryNav`) y búsqueda (`SearchBox`) **no se toca** (AC-9), solo el CSS
de layout sobre el que ya renderizan.

**Nota de revisión (amendment 2026-09-14):** la versión anterior de este
documento dejaba `ProductGrid.tsx` explícitamente "sin cambios" (columnas
fijas `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). El CTO/CEO pidió cards
más chicas — es decir, más columnas en pantallas anchas, no solo menos
padding interno — y el `spec.md` amplió el alcance para cubrir el layout de
grilla (AC-7/AC-8/AC-9 nuevos). La sección "Layout de `ProductGrid`" más
abajo es la definición nueva; todo lo demás de este documento (cuerpo de la
card) se revisó a la luz del ancho de card más angosto que resulta y se
confirma sin cambios — ver esa sección para el porqué.

## Decisión resumida

| Aspecto | Hoy (`ProductCard.tsx`) | Propuesta |
|---|---|---|
| Fondo del cuerpo (y de la card entera, ya que el body no tiene bg propio) | `bg-white` (no es un token de `brand.md`) | `bg-beige-100` |
| Padding del cuerpo | `p-4` (16px uniforme) | `pt-3 px-3.5 pb-4` (12px / 14px / 16px, asimétrico) |
| Nombre — peso/tamaño | `font-medium` (500), sin tamaño explícito → hereda 16px base | `font-semibold` (600), `text-sm` (14px) |
| Nombre — color | `text-sage-800`, hover `group-hover:text-sage-600` | sin cambio |
| Precio | `<ProductPrice size="sm" />`, sin tocar | sin cambio — `ProductPrice` no se modifica |
| Radio / imagen / `OfferBadge` | `rounded-lg`, `aspect-square` + `bg-beige-100`, badge sobre la foto | sin cambio (AC-6) |
| Columnas de `ProductGrid.tsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (tope fijo de 3, por breakpoint de *viewport*) | `grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr))` — columnas según ancho de *contenedor*, sin tope explícito (ver "Layout de `ProductGrid`") |
| `gap` de `ProductGrid.tsx` | `gap-4` (16px) | sin cambio — 16px |

**Re-verificación tras angostar la card (amendment 2026-09-14):** con el
nuevo grid, el ancho de card real oscila entre 190px (justo después de que
entra una columna nueva) y ~296px (justo antes de que entre la siguiente),
en vez del ~363px fijo que tenía con 3 columnas en un contenedor
`max-w-6xl`. Repasé fondo/padding/tipografía del cuerpo contra ese nuevo
mínimo real (190px, no solo el caso mobile de 358px de la versión anterior
de este documento) y **no cambian**: `text-sm font-semibold` (14px/600) para
el nombre y `ProductPrice size="sm"` (`text-lg`, 18px, para el precio final)
siguen sin superponerse ni truncarse a 190px — ver el detalle numérico y el
mockup (sección 4) en "Layout de `ProductGrid`" más abajo.

## Layout

El cuerpo de la card es el mismo bloque de hoy, debajo de la imagen, dentro
del mismo `<Link>` que ya envuelve toda la card (sin nuevos wrappers):

1. Imagen (`aspect-square`, `bg-beige-100`, `OfferBadge` superpuesto arriba a
   la izquierda cuando `en_oferta`) — **sin cambios**.
2. Cuerpo (`flex flex-col gap-1`, `flex-1`):
   - `<h2>` nombre del producto.
   - `<p>` presentación (`text-sm text-sage-600` — **sin cambios**, fuera de
     alcance de este spec).
   - `<ProductPrice product={product} className="mt-auto pt-2" />` —
     **sin cambios**, se apoya en `mt-auto` para quedar siempre al pie de la
     card sin importar cuántas líneas ocupe el nombre.

### Fondo: `bg-beige-100`

`docs/brand.md` ya documenta `beige-100` como "fondo del logo · header ·
footer · superficies" — es el token que usa el `<header>` y el `<footer>`
del sitio (`src/app/layout.tsx`) para marcar una superficie elevada sobre el
fondo de página `beige-50`. `bg-white` no es un token documentado en
absoluto (es un valor de Tailwind sin relación con la paleta de marca).

Decisión: la card pasa a ser una "superficie" más, consistente con
header/footer, en vez de un blanco genérico sin relación con la identidad
cálida (crema/salvia) del resto del sitio. Como el `<div>` del cuerpo no
tiene fondo propio hoy (hereda el `bg-white` del `<Link>` contenedor), el
cambio real es en el contenedor exterior de `ProductCard`; el borde
`border-beige-200` se mantiene y sigue leyéndose sobre `beige-50` (fondo de
página) tanto como sobre el nuevo `beige-100` del cuerpo — es el mismo
patrón que header/footer ya usan (`border-b/t border-beige-200 bg-beige-100`
sobre un `body` en `beige-50`).

Esto también hace que el fondo del contenedor de imagen (`beige-100`, sin
cambios) y el del cuerpo queden en el mismo tono: la card se lee como una
superficie continua, con la foto como único quiebre visual — no dos
bloques de color distintos apilados.

### Padding: `pt-3 px-3.5 pb-4` (12px / 14px / 16px)

No copio literalmente los valores decimales del mockup de referencia
(`.75rem .85rem .95rem`, que no mapean limpio a la escala de Tailwind);
tomo la misma intención (menos aire arriba, más abajo) con valores que sí
existen en la escala por defecto de Tailwind:

- **Arriba (12px):** la imagen ya aporta separación visual fuerte; no hace
  falta tanto aire entre el borde de la foto y el nombre.
- **Costados (14px):** levemente más ajustado que hoy (16px), da un poco
  más de ancho útil al texto sin acercarse a los bordes de la card.
- **Abajo (16px):** el valor más generoso, para que el precio (que queda
  siempre al pie por el `mt-auto`) no se sienta pegado al borde inferior de
  la card.

### Nombre: `text-sm font-semibold text-sage-800`

`text-sm` (14px) + `font-semibold` (600) en vez de heredar el tamaño base
(16px) con `font-medium` (500). Justificación: hoy el precio
(`ProductPrice` `size="sm"` → `text-lg font-semibold`, 18px/600) ya es
visualmente más grande que el nombre; bajar el nombre a 14px acentúa esa
jerarquía a propósito (el precio es el dato que más pesa en una card de
e-commerce) en vez de dejarla como un efecto lateral no buscado del tamaño
heredado de `body`. `text-sm` iguala el tamaño del nombre al de la
presentación (`text-sm text-sage-600`, sin cambios) — se siguen
diferenciando por peso (600 vs. 400) y color (`sage-800` vs. `sage-600`),
no por tamaño. Color y estado hover (`group-hover:text-sage-600`) **no
cambian**.

### Precio: `ProductPrice` sin modificar

Resuelvo la pregunta abierta 2 del spec: **no hace falta tocar
`ProductPrice.tsx`**. Razones:

- El tamaño `size="sm"` que ya usa `ProductCard` (precio final `text-lg
  font-semibold text-sage-900`) tiene contraste de sobra sobre el nuevo
  fondo `beige-100` (ver tabla de contraste abajo) y ya crea la jerarquía
  correcta frente al nombre reducido a `text-sm`.
- El mockup de referencia sugiere `font-size:.85rem; color: sage-600` para
  el precio, pero eso es más chico que el nombre propuesto (14px) — invierte
  la jerarquía que sí tiene sentido en una card de e-commerce (el precio
  debe pesar más, no menos, que el nombre). No lo adopto.
- Tocar `ProductPrice` para "ajustar" el precio en la card arriesgaría
  `size="lg"` de la ficha de detalle (`/producto/[id]`), que el CTO/CEO
  pidió explícitamente no alterar. Al no tocar el componente, ese riesgo
  desaparece por completo — la ficha de detalle queda bit-a-bit igual.

### `OfferBadge` sobre el fondo elegido

El badge vive **sobre la foto** (`absolute left-2 top-2` dentro del
contenedor de imagen), no en el cuerpo — tiene su propio fondo opaco
(`bg-sage-600` / `text-beige-50`, ya documentado en `brand.md` como AA para
texto de UI) que no depende en absoluto del fondo del cuerpo. Cambiar el
cuerpo a `beige-100` no lo toca: ni posición, ni tokens, ni contraste. Esto
satisface AC-3 para el badge en sí de forma directa (no hay superficie
compartida entre badge y cuerpo).

Lo único de "información de oferta" que sí comparte fondo con el cuerpo es
el precio tachado (`ProductPrice`, `text-xs text-sage-500`, el precio
anterior cuando hay descuento) y el chip de descuento (`bg-sage-100
text-sage-800`, con fondo propio, tampoco afectado). Ver nota de contraste
abajo — no se toca ese color en este spec, pero dejo el dato calculado
porque `beige-100` lo mueve un poco.

## Layout de `ProductGrid`

`ProductGrid.tsx` deja de fijar columnas por breakpoint (`grid-cols-1
sm:grid-cols-2 lg:grid-cols-3`) y pasa a un grid intrínseco:

```css
grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr));
gap: 1rem; /* gap-4, sin cambios respecto al valor actual */
```

- **Ancho mínimo de columna — 190px, confirmado.** El nombre más largo real
  en `public/data/products.json` es `"Esm. Gel N°60 PEACH NUDE x 15 ml"` (33
  caracteres). Con `text-sm font-semibold` (14px) el ancho promedio por
  carácter ronda 8px, es decir ~264px de texto corrido. Con el padding
  horizontal de la card (`px-3.5` = 14px por lado) una columna de 190px deja
  ~162px de ancho útil de texto, es decir ~20 caracteres por línea → ~40
  caracteres disponibles en 2 líneas, más que los 33 del nombre real. El
  nombre entra cómodo en 2 líneas sin invadir el precio (que va debajo, en
  su propio bloque, no superpuesto). No hace falta subir el mínimo por
  encima de 190px.
- **`auto-fill`, no `auto-fit`.** Con decenas de productos el grid rara vez
  termina en una fila incompleta, así que en el caso normal ambos se
  comportan igual. La diferencia importa en el escenario de AC-9 (buscador/
  filtro que puede dejar 1-2 resultados): `auto-fit` colapsaría las columnas
  vacías y estiraría esas 1-2 cards a lo ancho de todo el contenedor
  (`1fr` sin límite superior), rompiendo el ancho de card esperado.
  `auto-fill` mantiene esas columnas "fantasma" en el grid, así que las
  cards conservan su ancho natural (~190-220px) incluso con pocos
  resultados. Se usa `auto-fill`.
- **`gap`: se mantiene `gap-4` (16px).** Es el valor actual, no hay ningún
  requisito (AC-7/AC-8/AC-9) que pida cambiarlo, y separa bien cards de
  ~190-220px sin desperdiciar ancho útil en mobile.
- **Tope superior de columnas: no se agrega.** El contenedor de la grilla
  está dentro de `max-w-6xl` (~1152px). A ese ancho, con `minmax(190px,1fr)`
  y `gap-4`, ya entran como máximo 5 columnas (ver cálculo abajo) — el
  propio `max-w-6xl` actúa como tope natural. Agregar un `grid-template-
  columns` con límite explícito (p. ej. `repeat(auto-fill, minmax(190px,
  min(220px,1fr)))`) sería una capa extra de complejidad sin beneficio visible
  a este ancho de contenedor; no se adopta.
- **Columnas resultantes:**
  - **Mobile (~390px, gutter `px-4` vigente → ~358px de ancho útil):**
    `(358 + 16) / (190 + 16) ≈ 1.8` → **1 columna**. Coincide con el
    comportamiento actual (antes `grid-cols-1`), pero ahora es consecuencia
    del ancho disponible, no de un breakpoint fijo.
  - **Desktop (`max-w-6xl` ≈ 1152px):** `5×190 + 4×16 = 1014px` cabe;
    `6×190 + 5×16 = 1220px` no. → **5 columnas**, cada una estirada por
    `1fr` a ~218px de ancho real (`(1152 − 4×16) / 5`).

Esto cubre **AC-7** (el número de columnas lo determina el ancho del
contenedor vía `auto-fill`/`minmax`, no un breakpoint fijo `sm:`/`lg:`),
**AC-8** (190px de mínimo no rompe la legibilidad del nombre más largo real,
verificado arriba) y **AC-9** (es un cambio puramente de layout de grilla;
no toca el estado de filtrado/búsqueda ni la lista de productos que
`ProductGrid` recibe, por lo que no puede romper esa lógica).

## Cumplimiento de acceptance criteria

1. **AC-1:** fondo (`beige-100`), padding (`pt-3 px-3.5 pb-4`) y tipografía
   del nombre (`text-sm font-semibold text-sage-800`) quedan documentados
   acá con valores únicos y sin ambigüedad — nada implícito.
2. **AC-2 (contraste AA):**
   - Nombre `sage-800` (`#3d4436`) sobre `beige-100` (`#f4f1e8`): ratio
     ≈ **8.9:1** (AA para texto normal exige 4.5:1; AAA exige 7:1 — pasa
     ambos).
   - Precio final `sage-900` (`#333a2e`) sobre `beige-100`: ratio
     ≈ **10.3:1** — pasa AA y AAA.
   - Ambos superan largamente el mínimo, con margen frente a cualquier
     variación de renderizado de fuente/antialiasing.
3. **AC-3 (no regresión de `OfferBadge`/precio de oferta):**
   - `OfferBadge`: sin cambios de posición, tokens ni fondo — no comparte
     superficie con el cuerpo (ver sección anterior). Los tests existentes
     de la spec 0005 sobre `OfferBadge` no deberían necesitar tocarse.
   - Precio final y chip de descuento: contraste igual o mejor que hoy
     (fondos propios o alto contraste, ver tabla).
   - Precio anterior tachado (`sage-500 text-xs`, sin tocar en este spec):
     el ratio baja de ≈3.4:1 (sobre `white`) a ≈3.0:1 (sobre `beige-100`) —
     **ya estaba por debajo de AA hoy** (4.5:1 para texto normal); el nuevo
     fondo lo mueve de forma marginal, no lo "rompe" de nuevo. Lo marco
     como pregunta abierta más abajo porque, a rigor, cualquier baja podría
     leerse como "degradar" — documento el número exacto para que
     CTO/CEO/developer-agent decidan con datos si amerita spec propio (no
     es parte del alcance de éste: no toco `ProductPrice`).
4. **AC-4 (390px, sin overlap/scroll horizontal):** el cuerpo sigue siendo
   un `flex-col` vertical (nombre → presentación → precio con `mt-auto`);
   no hay elementos posicionados en el eje horizontal que puedan
   superponerse sin importar cuántas líneas ocupe el nombre. A 390px de
   viewport con el gutter de `px-4` del `<main>`, la card mide ~358px de
   ancho; con el padding lateral propuesto (14px) el texto tiene ~330px de
   ancho disponible — un nombre real largo ("Esm. Gel N°60 PEACH NUDE x 15
   ml", 33 caracteres) envuelve en 1–2 líneas sin generar scroll horizontal
   (verificado en el mockup, sección 3, con el nombre real de
   `products.json`).
5. **AC-5 (click/hover/focus sin cambios):** la estructura del `<Link>`
   exterior (href, `group`, `hover:shadow-md`,
   `focus-visible:outline-*`) no se toca — solo cambian clases de fondo,
   padding y tipografía del `div` interno y del `<h2>`. El hover de color
   del nombre (`group-hover:text-sage-600`) se conserva tal cual.
6. **AC-6 (radio/imagen sin cambios):** `rounded-lg`, `aspect-square` y
   `bg-beige-100` del contenedor de imagen no se tocan en ninguna
   propuesta de este documento.

## Estados y responsividad

- **Mobile (~390px):** con el nuevo grid intrínseco de `ProductGrid`
  (`auto-fill, minmax(190px, 1fr)`, `gap-4`) entra 1 columna (ver cálculo en
  "Layout de `ProductGrid`"); la card ocupa el ancho completo disponible.
  Ver AC-4 y AC-7.
- **Desktop (`max-w-6xl` ≈ 1152px):** el mismo grid resuelve 5 columnas de
  ~218px cada una (ver cálculo en "Layout de `ProductGrid`"); el cuerpo de
  la card se comporta igual, solo cambia el ancho de columna. El padding
  lateral de 14px deja algo más de ancho útil al texto que los 16px
  actuales, marginal a estos anchos.
- No hay estado de `prefers-reduced-motion` relevante: no se introduce
  ninguna animación nueva; la única transición existente (`transition-shadow`
  del hover) no cambia.
- Sin JS / antes de hidratación: todo el contenido (imagen, nombre,
  presentación, precio, badge) es HTML estático servido por SSG — no
  depende de hidratación de React para ser visible ni para el layout. No
  aplica ninguna consideración adicional de progressive enhancement porque
  no hay ningún elemento interactivo nuevo en este spec (el único
  interactivo, el `<Link>` completo, ya funciona sin JS).

## Accesibilidad

- Estructura semántica sin cambios: `<h2>` para el nombre (ya así hoy),
  `<p>` para presentación y precio, `<Link>` como contenedor de card
  completa (patrón "toda la card es un link", ya construido en spec 0001,
  no se re-discute acá).
- Orden de foco: sin cambios — un solo elemento focuseable por card (el
  `<Link>` exterior); el `focus-visible:outline` existente no se toca.
- Alt text de la imagen: sin cambios (`alt={product.nombre}`, ya cubre lo
  necesario) — fuera de alcance de este spec.
- Contraste: ver AC-2/AC-3 arriba.

## Content mapping

Sin cambios respecto a lo ya construido — este spec es puramente visual,
no reordena ni agrega copy:

1. Imagen del producto (`product.imagen`).
2. `OfferBadge` condicional (`product.en_oferta`).
3. Nombre (`product.nombre`).
4. Presentación (`product.presentacion`).
5. Precio (`ProductPrice`: `precio_venta`, y si hay oferta,
   `precio_regular` + `descuento_pct`).

## Tokens nuevos para `docs/brand.md`

El CTO/CEO pidió formalizar estos valores en `brand.md`, con el mismo
patrón de anotación de uso que ya existe para los chips de categoría (spec
0012). Son cambios que el **developer-agent** aplica en su fase de diseño
(`plan.md`), no yo — dejo acá exactamente qué agregar:

1. **Tabla de paleta — extender la anotación de uso de `beige-100`:**
   de `"fondo del logo · header · footer · superficies"` a
   `"fondo del logo · header · footer · superficies · cuerpo de
   ProductCard"` (no es un token nuevo, es una extensión de uso — igual que
   `sage-100`/`sage-500` ya documentan más de un uso cada uno).
2. **Tabla de paleta — extender la anotación de uso de `sage-800`:**
   agregar `"· nombre de producto en ProductCard"` a la fila existente
   (`"énfasis"`).
3. **Sección "Radios y espaciado" — nueva entrada de padding de
   componente**, siguiendo el mismo estilo de bullet que ya documenta
   radios:
   > Padding del cuerpo de `ProductCard`: asimétrico (`pt-3 px-3.5 pb-4` —
   > 12px/14px/16px). Menos aire arriba (ya separado por la imagen), más
   > abajo (el precio queda al pie via `mt-auto`).
4. **Sección "Tipografía" — nueva entrada de tamaño de componente**
   (no es un rol tipográfico nuevo, es una instancia documentada de
   `--font-sans`, igual que ya se documenta el tracking de "SPA DE PIEL"):
   > Nombre de producto en `ProductCard`: `text-sm font-semibold` (14px/600)
   > — más chico que el cuerpo base a propósito, para que el precio
   > (`text-lg font-semibold` vía `ProductPrice`) sea el dato dominante de
   > la card.

## Preguntas abiertas

1. **Contraste del precio anterior tachado (`sage-500` en `ProductPrice`):**
   ya está por debajo de AA hoy (~3.4:1 sobre `bg-white`) y baja
   marginalmente a ~3.0:1 sobre el nuevo `beige-100`. No lo corrijo en este
   spec porque tocar `ProductPrice` arriesga la ficha de detalle
   (restricción explícita del CTO/CEO) y porque el problema es preexistente,
   no introducido acá — pero lo señalo con el número exacto para que se
   decida si amerita un spec de corrección futuro (análogo al de los chips,
   spec 0012), posiblemente subiendo ese color a `sage-600` (documentado en
   `brand.md` como "texto secundario sobre crema, contraste AA") en un spec
   dedicado que sí evalúe el impacto en la ficha de detalle.
2. **Asset de foto real en el mockup:** el prototipo de revisión usa
   recuadros de texto en vez de las fotos reales de LACA (evité
   hotlinkear las URLs externas de `laboratoriolaca.com` dentro del
   artifact por riesgo de CORS/hotlink-protection en el sandbox, y el
   tratamiento de imagen está fuera de alcance de este spec de todos
   modos) — no es necesario resolver esto para aprobar `ux.md`, ya que la
   imagen no cambia.
3. **`px-3.5` como valor "no estándar" percibido:** 14px sí existe en la
   escala por defecto de Tailwind (`3.5` = `0.875rem`), pero es menos común
   que `p-4`. Si el developer-agent prefiere simplificar a un padding
   simétrico de `p-3.5` (14px parejo) en vez del asimétrico propuesto, el
   impacto en AC-1/AC-4 es nulo — lo dejo como variante aceptable si
   `plan.md` prioriza simplicidad de implementación sobre la asimetría
   exacta que propongo, siempre que quede documentado en `brand.md` con el
   valor que finalmente se use.
