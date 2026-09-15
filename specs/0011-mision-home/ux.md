# 0011 — UX de la sección de misión/nosotros (home)

**Mockup:** https://claude.ai/artifact/1AMG2PS4kzpQYrppfMFvQU — vista previa
interactiva (carrusel real con scroll-snap, toggle para comparar el estado
con/sin mejoras JS, logo real de marca). Aprobado por el CTO/CEO
2026-09-14. Es una vista de revisión, no el código final — el developer
agent implementa la versión real en Next.js siguiendo `plan.md`, pero debe
usar este mockup como referencia visual/de comportamiento, no solo el texto
de abajo.

**Insumo:** `spec.md` (aprobado) + `docs/brand.md`. Este documento resuelve
los puntos que la spec delega explícitamente a UX (formato de carrusel,
CTA, corte visual con el catálogo) y no cambia ningún acceptance criterion.
No define código ni componentes — el developer agent traduce esto a
`plan.md`.

No hay ninguna librería de carrusel/slider en el repo (`package.json` solo
tiene `next`/`react`/`react-dom`) ni ningún componente reutilizable en
`src/components`. Dado el principio de "$0 infraestructura" y "portfolio
grade" de `constitution.md`, y que la interacción real (swipe + snap) la
puede dar el navegador sin JS, la recomendación de esta pieza de UX es que
el developer agent evalúe un carrusel liviano construido sobre CSS scroll
snap nativo en vez de sumar una dependencia — pero la elección de
implementación queda para `plan.md`; acá solo se especifica el
comportamiento que tiene que cumplir.

> **Enmienda 2026-09-14.** El developer agent implementó la versión
> original de este documento literalmente: flechas prev/next repetidas
> *dentro de cada slide* (una copia por mensaje, porque sin JS cada flecha
> necesita ser un ancla local a `#mensaje-N` embebida en ese mismo slide
> para funcionar). Resultado: hasta 8 enlaces de flecha en el DOM (5
> "siguiente" menos el último slide, 4; 5 "anterior" menos el primero, 4),
> que un lector de pantalla en modo "leer todo" encuentra intercalados con
> el texto de cada mensaje — ruido no previsto por el diseño original. El
> CTO/CEO decidió explícitamente: *"si es necesario agregar JS,
> agreguemos, para mejorar la experiencia y resolver el problema de las
> flechas duplicadas."* Las secciones **Interacción** y **Accesibilidad**
> de este documento quedan reemplazadas por el diseño de mejora progresiva
> que sigue; el resto del documento (Layout, CTA, Mapeo de contenido) no
> cambia. Ver también las notas puntuales agregadas en "Estados y
> responsive".

## Layout

Orden dentro de `<main>` (AC-1, sin tocar `layout.tsx` salvo lo mínimo
indicado abajo):

1. **Sección de misión** (`<section>`, landmark propio) — primer hijo de
   `<main>`.
   1. Carrusel de 5 mensajes (slide 5 incluye el mensaje 5 + el
      logo/wordmark, ver "Mapeo de contenido").
   2. CTA "Ver catálogo", **debajo del carrusel**, como cierre de la
      sección completa (no dentro de un slide, no fijo/sticky durante el
      recorrido del carrusel — ver "Interacción").
2. Separador visual hairline (mismo recurso que ya usa el sitio entre
   header/contenido y contenido/footer: borde `beige-200`) + un salto de
   espacio notoriamente mayor al que se usa entre bloques internos del
   catálogo, para marcar el cambio de sección sin agregar texto nuevo.
3. Bloque de catálogo, intacto: heading "Catálogo", `CategoryNav`,
   `CatalogView` (AC-4).

Contenedor: la sección de misión vive dentro del mismo `max-w-6xl` /
`px-4` que ya define `layout.tsx` para `<main>` — no se propone full-bleed
edge-to-edge (eso requeriría tocar el padding de `<main>` en `layout.tsx`,
fuera del "mínimo imprescindible" que permite la spec). En cambio, la
sección se trata como un panel propio: fondo distinto al de la página
(`sage-50`/`beige-100`, no `beige-50` que es el fondo de página) y
`rounded-lg`, reutilizando el radio que `brand.md` ya define para
"cards" — no se inventa un radio nuevo.

**Cambio de jerarquía de encabezados (mínimo imprescindible, AC-1):** hoy
`page.tsx` tiene un único `h1` ("Catálogo"). Al pasar la misión a ser el
primer bloque, ese `h1` debería ser el mensaje 1 del carrusel ("Cada piel
tiene su propia historia.") — no es copy nuevo, es el mismo mensaje 1 ya
aprobado, solo con otro nivel de encabezado — y "Catálogo" pasa a `h2`.
Esto mantiene un solo `h1` por página (buena práctica de accesibilidad) sin
inventar ningún texto ni tocar el copy del catálogo.

## Interacción

**Formato:** carrusel de una sola tarjeta visible por vez (sin "peek" de
la siguiente en ningún breakpoint) — así se preserva la lectura secuencial
mensaje-por-mensaje del post de origen y se evita que el carrusel se lea
como "5 apiladas" (lo que AC-7 prohíbe explícitamente).

**Auto-avance: NO.** El post de Instagram de origen que esta sección
replica ("replicando la experiencia del post de Instagram", decisión CTO
2026-09-14) es swipe manual, sin autoplay — Instagram no auto-avanza
carruseles de posts. Mantener manual-only también evita el requisito WCAG
2.2.2 (mecanismo de pausa) que un autoplay activaría, y respeta el ritmo
de lectura de mensajes de largo desparejo (el mensaje 2 es sensiblemente
más largo que el 1, 4 y 5).

### Controles — base sin JS vs. mejora con JS (revisado 2026-09-14)

**Decisión:** en el estado base (SSG, sin JS) **no hay flechas
prev/next**. El único control explícito en el HTML servido son los **5
dots** (un set único, fuera del loop de slides, no uno por mensaje) más el
scroll/swipe nativo. Las flechas prev/next existen **solo** como mejora
post-hidratación, en un set único (2 botones, no uno por slide).

**Por qué esto es mejor experiencia sin JS que mantener flechas
duplicadas como red de seguridad:** la alternativa (mantener las flechas
por slide como fallback y solo ocultarlas con JS) deja el peor caso —JS
deshabilitado permanentemente— exactamente igual de ruidoso que hoy: hasta
8 enlaces de flecha repetidos para un lector en "leer todo". Quitar las
flechas del HTML base y dejar que los dots + el scroll nativo cubran esa
necesidad resuelve el problema de raíz en vez de acotar su ventana de
aparición: el peor caso pasa de 8 enlaces duplicados a 0.

**Mecanismo sin JS (base, SSG, cumple AC-7):**
- Los 5 mensajes son contenido real y visible en el HTML servido,
  dispuestos en una fila con `scroll-snap`; se recorren con swipe táctil,
  scroll de trackpad/rueda, o arrastrando la barra de scroll.
- Los **5 dots** son anclas reales (`<a href="#mensaje-3">`, no
  `onClick` de React) — saltan directo a cualquier mensaje, funcionan
  apenas el HTML carga, sin esperar hidratación. El salto puede animarse
  con `scroll-behavior: smooth` declarado en CSS (no requiere JS).
- El contenedor de scroll del carrusel es él mismo un elemento enfocable
  (`tabindex="0"`, `role="region"`, `aria-label` — ver Accesibilidad): una
  vez que tiene el foco (Tab), las **flechas de teclado izquierda/derecha
  ya funcionan de forma nativa** (comportamiento estándar del navegador
  para desplazar un contenedor con overflow que tiene foco), sin necesitar
  botones de flecha ni JS. Esto es lo que reemplaza, en el estado base, el
  rol que cumplían las flechas duplicadas.
- Nada de esto depende de que cargue JS: es el comportamiento *por
  defecto* del carrusel, no un "fallback" — la hidratación solo agrega
  controles encima, nunca es condición para que el contenido exista o se
  pueda recorrer.

**Mejora con JS (post-hidratación):**
- Se agrega un **único set global de flechas prev/next** (2 botones,
  fuera del loop de slides — nunca uno por mensaje), posicionado según
  breakpoint (ver "Estados y responsive"). Actúan sobre el mismo
  contenedor de scroll (`scrollTo`/`scrollIntoView` al mensaje
  correspondiente), no son anclas.
- Sin salto visual (FOUC): como estas flechas **no existen en el HTML
  base** (a diferencia del enfoque anterior, no hay nada "duplicado" que
  ocultar), no hay contenido que parpadee o se remueva al hidratar. Lo
  único a cuidar es que su aparición no mueva el layout existente
  (CLS): el espacio que ocupan se reserva desde el render inicial con CSS
  (un contenedor vacío del tamaño del botón, `visibility: hidden` en vez
  de no renderizado), y el componente cliente solo alterna a
  `visibility: visible` tras montar — nunca inserta/remueve el nodo del
  DOM, así que no hay reflow ni parpadeo de texto vecino.
- Los dots existentes se enriquecen (no se duplican): el dot del mensaje
  visible recibe `aria-current="true"` una vez que JS puede calcular la
  posición activa mediante un `IntersectionObserver` sobre los slides.
- Una región `aria-live="polite"` (visualmente oculta) anuncia el cambio
  de mensaje al navegar con las flechas, los dots o el teclado — mejora no
  bloqueante: sin JS, un lector de pantalla igual recorre los 5 mensajes
  porque están todos en el DOM en orden.
- Teclado: con el foco dentro del carrusel (contenedor o cualquier
  flecha/dot), las teclas izquierda/derecha avanzan/retroceden un mensaje
  con el mismo `scrollTo` que usan las flechas — este es un refinamiento
  del scroll nativo del punto anterior (snap más preciso), no un
  reemplazo funcional: si JS no corre, el scroll nativo del contenedor ya
  cubre el caso.

**El contenido nunca depende de JS.** Lo único que la hidratación agrega
u optimiza son los *controles* (flechas, `aria-current`, `aria-live`,
snap fino por teclado) — los 5 mensajes, su orden y su navegabilidad por
swipe/scroll/dots/teclado nativo son idénticos con o sin JS. Esto es
literalmente lo que pide AC-7 y no cambia respecto al documento original.

**Swipe en mobile:** dado por el scroll nativo del navegador (idéntico
con o sin JS) — no requiere gesture handling en JS en ningún estado.

## CTA "Ver catálogo"

- **Dónde:** un único CTA, al final de la sección de misión, después del
  slide 5 (mensaje 5 + logo) — no se repite ni queda fijo/sticky mientras
  se recorre el carrusel (la sección es corta — 5 mensajes cortos — no
  hace falta un CTA persistente, y uno flotante agregaría complejidad no
  pedida por la spec).
- **Cómo se ve:** un botón/link con **texto + flecha**, no un ícono solo
  (un ícono-solo necesitaría de todos modos un texto accesible duplicado,
  así que se muestra directo). Tratamiento visual de botón primario,
  reutilizando el mismo lenguaje que ya usa `CategoryNav` para su chip
  activo (fondo `sage-500`/`600`, texto `beige-50`, `rounded-lg` en vez de
  `rounded-full` para diferenciarlo de un chip de filtro).
- **Qué hace:** scroll suave dentro de la misma página hacia el bloque de
  catálogo (ancla al heading "Catálogo", ahora `h2`) — no navega a otra
  URL. El header no es sticky en este sitio, así que no hace falta
  compensar con `scroll-margin-top` para que el heading no quede tapado.

## Estados y responsive

**Mobile (~390px, AC-6):**
- Un mensaje ocupa el 100% del ancho disponible dentro del gutter de
  `px-4` ya vigente en el sitio.
- Alto del slide **automático según contenido**, nunca fijo — así el
  mensaje 2 (el más largo) no se corta ni superpone texto (esto es
  literalmente lo que pide AC-6).
- Las flechas **no se superponen al texto**: a este ancho se ubican en la
  misma fila que los dots (flecha-izq · dots · flecha-der), debajo del
  mensaje, no flotando sobre el texto. Esto es una decisión concreta para
  evitar el riesgo de superposición que AC-6 prohíbe explícitamente a
  390px. **(Revisado 2026-09-14: estas flechas solo existen tras
  hidratar — ver "Controles" en Interacción. El espacio de esa fila se
  reserva desde el render inicial con `visibility: hidden` para que su
  aparición no desplace los dots ni el mensaje debajo — sin esto, a
  390px el salto de "solo dots centrados" a "flecha·dots·flecha" movería
  la fila y podría empujar el CTA, que es exactamente el tipo de
  corrimiento que AC-6 busca evitar.)**
- Área táctil de cada dot ≥44px aunque el punto visual sea pequeño
  (8–10px) — el hitbox se extiende con padding invisible.
- CTA a ancho completo o centrado, sin recortarse.

**Desktop:**
- El texto del mensaje (Cormorant Garamond, como ya define `brand.md`
  para contenido destacado) se limita a un ancho de línea legible
  (más angosto que el `max-w-6xl` del contenedor), no estirado al ancho
  completo — mejora la lectura de una frase corta en tipografía display.
- Flechas superpuestas a los bordes izquierdo/derecho del slide,
  verticalmente centradas, círculo semitransparente en tonos `sage`, con
  estado hover (mismo patrón de cambio de color que ya usan los chips de
  `CategoryNav`). **(Revisado 2026-09-14: solo tras hidratar — ver
  "Controles" en Interacción. Al estar superpuestas con posición absoluta
  sobre el slide, no ocupan espacio en el flujo del layout, así que su
  aparición no produce CLS en desktop como sí podría en mobile.)**
- Dots debajo, centrados.

**`prefers-reduced-motion`:** al no haber auto-avance, no hay movimiento
continuo que pausar (evita por diseño el requisito WCAG 2.2.2 de dar un
control de pausa). Lo único animado es el scroll suave al cambiar de
mensaje o al usar el CTA — con esta preferencia activada, ese
desplazamiento pasa a ser instantáneo en vez de animado.

**Foco visible:** mismo tratamiento que ya existe en el sitio (outline
`sage-500`, offset) — se reutiliza tal cual en flechas, dots y CTA, sin
inventar un estilo de foco nuevo.

## Accesibilidad (revisado 2026-09-14)

**El trade-off de flechas duplicadas ya no es un trade-off aceptado
permanente.** La versión original de este documento aceptaba hasta 8
enlaces de flecha repetidos (uno "anterior"/"siguiente" embebido en cada
slide, como red de seguridad sin JS) como costo permanente de la solución
sin-JS. Ese enfoque implementado por el developer agent generó el
problema real que motiva esta enmienda. El diseño revisado elimina la
duplicación en la fuente en vez de acotarla a la ventana previa a la
hidratación:

- **Peor caso (JS deshabilitado o falla permanentemente):** 0 enlaces de
  flecha en el DOM. Un lector de pantalla en "leer todo" encuentra los 5
  mensajes intercalados solo con los 5 enlaces de dot ("Ir al mensaje N de
  5") — ningún control por-slide, ninguna repetición.
- **Caso normal (JS carga):** se suma un único set de 2 botones de flecha
  (global, fuera del loop de slides) más `aria-current` en el dot activo y
  el anuncio por `aria-live`. Total de controles de flecha en el DOM en
  cualquier momento: 2, nunca más — no hay una versión "oculta" de 8
  flechas conviviendo con las 2 visibles; las 8 duplicadas del diseño
  anterior simplemente no se construyen.

Esto reemplaza la mención anterior de "mejora no bloqueante" para las
flechas: ahora las flechas en sí (no solo su resaltado) son enteramente
una mejora de JS, y su ausencia en el HTML base ya no es un problema de
accesibilidad porque el rol de "avanzar/retroceder" lo cubren el scroll
nativo, el swipe y el desplazamiento por teclado nativo del contenedor
(ver Interacción).

- La sección es un `<section>` con nombre accesible dado por
  `aria-labelledby` apuntando al propio `h1` (mensaje 1) — no se inventa
  un label nuevo de marketing, se reusa el copy ya aprobado como nombre
  accesible de la región.
- El carrusel en sí se marca como región con rol de carrusel
  (`aria-roledescription="carousel"`) y cada mensaje como un "slide"
  (`aria-roledescription="slide"`, con su posición — "2 de 5" — como
  parte del nombre accesible de cada uno).
- El contenedor de scroll es un elemento enfocable propio
  (`role="region"`, `tabindex="0"`, `aria-label="Mensajes de misión,
  usa las flechas del teclado para recorrer"` o equivalente) — esto es lo
  que habilita el desplazamiento por teclado nativo sin JS (ver
  Interacción) y existe en el HTML base, no es una mejora condicionada a
  hidratar.
- Región `aria-live="polite"` (visualmente oculta) que anuncia el cambio
  de mensaje al navegar con flechas, dots o teclado — mejora de JS, no
  bloqueante: sin JS, un lector de pantalla igual puede recorrer los 5
  mensajes en orden porque están todos en el DOM.
- Los **dots** son el único control por-slide que existe en el HTML base:
  enlaces reales (no `div`/`span` con `onClick`) con `aria-label`
  descriptivo ("Ir al mensaje 3 de 5"). El dot del mensaje visible recibe
  `aria-current="true"` una vez que JS puede calcularlo (`IntersectionObserver`);
  sin JS, ningún dot lleva `aria-current` (no hay forma sin JS de saber
  cuál está "activo" durante un scroll continuo), lo cual es aceptable
  porque los dots ya funcionan como navegación aunque ninguno esté
  marcado como actual.
- Las **flechas**, cuando existen (post-hidratación), son botones reales
  (`<button>`, no anclas — actúan sobre el contenedor de scroll, no
  navegan por URL) con `aria-label` descriptivo ("Mensaje anterior",
  "Mensaje siguiente").
- Orden de foco = orden visual = orden del DOM: contenedor de scroll (si
  se tabula directo a él) o flecha anterior (si existe) → 5 dots → flecha
  siguiente (si existe) → CTA → heading/nav/grid del catálogo — sin
  `tabindex` manual fuera del `tabindex="0"` del contenedor.
- El logo de cierre (slide 5) usa el lockup completo (`public/brand/
  logo.svg`), con `alt="RenovArte"` igual que ya usa `brand.md` para ese
  archivo — no `alt=""`, porque es la primera vez que aparece el lockup
  completo (no solo el wordmark del header) y cierra la narrativa de la
  sección.

## Mapeo de contenido

| Slide | Copy (tal cual "Contenido fuente" de `spec.md`) | Notas |
|---|---|---|
| 1 | "Cada piel tiene su propia historia." | Duplica como `h1` de la página (ver Layout). |
| 2 | "Tu piel está viva. Cambia, respira, se transforma. Conocerla es el primer paso." | El más largo — el slide no debe tener alto fijo (ver Responsive). |
| 3 | "El arte está en observar y elegir lo que cada piel necesita. Piel por piel." | — |
| 4 | "Renovarte no es empezar de cero." | — |
| 5 | "Este es nuestro comienzo." + logo/wordmark completo (`public/brand/logo.svg`) | Mensaje y logo **en el mismo slide**, replicando el cierre del post original. Ver nota de contraste abajo. |
| — | CTA "Ver catálogo" | No es de los 5 mensajes — copy funcional de UI ya autorizado por la decisión CTO #2, va después del carrusel, no dentro de un slide. |

**Nota de contraste ligada a la Pregunta abierta 1:** `brand.md` es
explícito en que el logo "no se usa sobre verdes oscuros" y solo sobre
fondo crema (`beige-50`/`beige-100`). Sea cual sea el fondo/textura que se
resuelva para la sección, el slide 5 puntualmente necesita mantener un
área de fondo clara (crema) detrás del logo — esto condiciona cualquier
propuesta de fondo más oscuro o texturado para el resto del carrusel.

## Preguntas abiertas

1. **Asset visual de fondo/textura** (ya abierta en `spec.md`): sigue sin
   resolver quién lo provee. Requisito funcional si se resuelve con CSS en
   vez de con un asset: debe mantener contraste AA para el texto
   `sage-700/800/900` sobre el fondo a cualquier tamaño de mensaje elegido,
   y debe dejar un área clara detrás del logo del slide 5 (ver nota de
   contraste arriba). Default sugerido por `spec.md` — y que este `ux.md`
   confirma como suficiente para no bloquear el plan técnico — es resolver
   con los tokens `sage-50`/`beige-100` ya existentes, sin foto ni
   textura nueva.
2. **Repetir el CTA más arriba/fijo:** no lo pide ningún AC; esta pieza de
   UX decide no proponerlo (ver "CTA — Dónde"). Si el CTO/CEO lo quiere de
   todos modos, es una decisión a tomar antes de que el developer agent
   cierre `plan.md`, no algo que este documento deja pendiente por
   omisión.
3. **(Agregada 2026-09-14) Consistencia entre navegadores del scroll por
   teclado nativo:** el diseño revisado depende de que un contenedor con
   `overflow`/`scroll-snap` y `tabindex="0"` responda a las flechas de
   teclado de forma nativa. El comportamiento es estándar, pero el
   developer agent debería confirmarlo en el set de navegadores que el
   sitio soporta (especialmente Safari/iOS, donde el manejo de foco en
   contenedores con overflow históricamente tuvo particularidades) antes
   de dar por cerrado el `plan.md`. Si algún navegador soportado no
   respeta esto, el fallback sigue siendo swipe/scroll/dots (no se pierde
   AC-7), pero afectaría la paridad de teclado prometida en este
   documento.
