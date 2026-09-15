# 0011 — Sección de misión/nosotros como centro de la home · Plan

Checked against [`../constitution.md`](../constitution.md). Insumos:
`spec.md` (aprobado) + `ux.md` (aprobado, con enmienda 2026-09-14 sobre
controles del carrusel). Este plan no reabre ninguna decisión de `ux.md`
ni ningún AC de `spec.md` — donde `ux.md` dejó una decisión de
implementación abierta, este plan la cierra.

> **Revisión 2026-09-14.** Esta versión del plan reemplaza el mecanismo de
> carrusel de la versión anterior (flechas prev/next duplicadas por slide
> vía anchors) por el diseño que amendó `ux.md` el mismo día, a pedido
> explícito del CTO/CEO ("si es necesario agregar JS, agreguemos"). Cambia
> sustancialmente la sección **"Mecanismo técnico del carrusel"** y el
> alcance de `MissionCarouselLive.tsx`; el resto del plan (RFC, resolución
> de fondo/textura, `mission-content.ts`, `page.tsx`, mapeo de ACs a
> tests salvo el detalle de flechas) no cambia. Ver también "Riesgos" al
> final, que incorpora el hallazgo sobre Safari/iOS pedido por `ux.md`
> (Pregunta abierta #3).

## Cambio de RFC: ninguno

No se propone amendment a `docs/rfc/0001-arquitectura-catalogo.md` ni un
RFC nuevo. Razones:

- No hay cambio de esquema de datos (`public/data/products.json` no se
  toca, RFC §2.4 intacto).
- No hay backend, base de datos ni infraestructura nueva (`constitution.md`
  §II.4/§II.5 se mantienen — la sección es 100% HTML/CSS/JS de cliente
  estático, SSG con mejora progresiva).
- El carrusel se resuelve con **CSS scroll-snap nativo + un componente
  cliente de mejora progresiva**, sin librería nueva. `ux.md` ya verificó
  que no hay ninguna dependencia de carrusel en `package.json`; este plan
  confirma que no hace falta agregar una — es una decisión de componente,
  no de arquitectura. Agregar JS de cliente para las flechas (pedido
  explícito del CTO/CEO en la enmienda) tampoco es un cambio arquitectural:
  el repo ya usa componentes cliente (`"use client"`) en `CategoryNav`/
  `CatalogView`/`SearchBox`; esto es más de lo mismo, no un patrón nuevo.
- Es aditivo y exclusivo de la home (`src/app/page.tsx` + 2 componentes
  nuevos); no cambia la estructura de carpetas descripta en RFC §2.5 más
  allá de sumar archivos donde ya se documenta que viven los componentes
  (`src/components/`).

Es un cambio de nivel "feature UI", no arquitectural — coherente con lo
que `spec.md` ya adelantó ("Conflictos con `constitution.md`: ninguno
detectado").

## Resolución de la Pregunta abierta #1 (fondo/textura, spec.md + ux.md)

Sin cambios respecto a la versión anterior de este plan — se resuelve con
los tokens existentes, sin asset nuevo, confirmando el default sugerido
por `spec.md`/`ux.md`:

- **Fondo del panel de misión:** `bg-sage-50` (`#f3f5ef`), `rounded-lg`
  (mismo radio que ya usa `brand.md` para cards), dentro del mismo
  `max-w-6xl`/`px-4` de `layout.tsx` — sin full-bleed, sin textura nueva.
- **Contraste verificado** (no es una suposición): `sage-700`/`800`/`900`
  sobre `sage-50` dan ratios de **7.2:1 / 9.2:1 / 10.7:1** respectivamente
  (cálculo WCAG relative-luminance sobre los hex de `globals.css`) — todos
  superan holgadamente el mínimo AA de 4.5:1 para texto normal, y
  `sage-700`+ ya casi alcanza AAA (7:1). No hace falta ajustar ninguna
  escala de color.
- **Logo del slide 5 (nota de contraste de `ux.md`):** se resuelve
  gratis. `public/brand/logo.svg` **ya trae su propio `<rect>` de fondo
  crema (`#F7F3EE`) embebido en el SVG** (confirmado leyendo el archivo) —
  el lockup nunca queda "sobre sage" aunque el panel de la sección lo
  esté, porque el propio asset dibuja su fondo claro. Aun así, para dar
  un margen de respiro visual entre el borde del logo y el `sage-50` del
  panel, el slide 5 envuelve el `<Image>` en un chip `bg-beige-100
  rounded-lg p-4` (mismo radio de card, mismo token que ya usa
  `brand.md` como "fondo del logo"). Cero asset nuevo, cero decisión de
  diseño pendiente.
- Si el CTO/CEO más adelante quiere un asset de textura propio, es un
  cambio aditivo de CSS/imagen de fondo sin tocar la estructura de este
  plan — se deja como posible follow-up, no bloqueante (ver "Riesgos").

## Archivos a crear/modificar

```
src/
├── lib/
│   └── mission-content.ts        # NUEVO — los 5 mensajes, fuente única de copy
├── components/
│   ├── MissionSection.tsx         # NUEVO — server component, sección + dots + contenedor enfocable
│   └── MissionCarouselLive.tsx    # NUEVO — client component, mejora progresiva:
│                                  #   flechas (mounted-gated), IntersectionObserver
│                                  #   (aria-current + aria-live), teclado delegado
└── app/
    └── page.tsx                   # MODIFICADO — orden + h1→h2

tests/
├── unit/
│   ├── mission-content.test.ts    # NUEVO
│   └── mission-section.test.tsx   # NUEVO
└── e2e/
    └── catalog.spec.ts            # EXTENDIDO
```

Nada se toca en `layout.tsx` (`ux.md` ya restringe esto: mismo
`max-w-6xl`/`px-4`, header no sticky, sin cambios). Nada se toca en
`CategoryNav.tsx` / `CatalogView.tsx` / `src/lib/products.ts` — el
catálogo se reutiliza tal cual (AC-4). Nada se toca en
`playwright.config.ts` (ver "Riesgos" — el proyecto de Playwright de este
repo solo corre Chromium; no se agrega un proyecto WebKit como parte de
este plan).

## `src/lib/mission-content.ts`

Sin cambios respecto a la versión anterior. Única fuente de verdad para el
copy, para que un test unitario pueda proteger contra "copy drift" sin
renderizar React:

```ts
export type MissionSlide = { n: 1 | 2 | 3 | 4 | 5; text: string };

export const MISSION_SLIDES: readonly MissionSlide[] = [
  { n: 1, text: "Cada piel tiene su propia historia." },
  { n: 2, text: "Tu piel está viva. Cambia, respira, se transforma. Conocerla es el primer paso." },
  { n: 3, text: "El arte está en observar y elegir lo que cada piel necesita. Piel por piel." },
  { n: 4, text: "Renovarte no es empezar de cero." },
  { n: 5, text: "Este es nuestro comienzo." },
];
```

`MissionSection.tsx` importa esto en vez de tener el copy hardcodeado en
JSX — así el test unitario compara contra "Contenido fuente" de `spec.md`
carácter a carácter, sin acoplarse al markup.

## Mecanismo técnico del carrusel (revisado 2026-09-14: sin flechas en el HTML base)

Reemplaza por completo la sección homónima de la versión anterior de este
plan (que duplicaba flechas `<a href="#mensaje-{n±1}">` dentro de cada
`<li>` como red de seguridad sin JS). Sigue la enmienda de `ux.md`:
**en el HTML servido no hay ningún control de flecha** — solo los 5
mensajes, un contenedor de scroll enfocable, y 5 dots (un único set). Las
flechas existen exclusivamente como mejora post-hidratación, en un único
set global de 2 botones.

**Estructura (`MissionSection.tsx`, server component):**

```tsx
<section aria-labelledby="mision-heading" className="rounded-lg bg-sage-50 px-4 py-10 sm:px-8 sm:py-14">
  <div
    role="region"
    aria-label="Mensajes de misión, usa las flechas del teclado para recorrer"
    tabIndex={0}
    className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto"
  >
    <ul className="flex w-full">
      <li id="mensaje-1" role="group" aria-roledescription="slide" aria-label="1 de 5" className="w-full shrink-0 snap-center ..."> {/* <h1 id="mision-heading"> */}
      <li id="mensaje-2" role="group" aria-roledescription="slide" aria-label="2 de 5" ...>
      <li id="mensaje-3" ... aria-label="3 de 5">
      <li id="mensaje-4" ... aria-label="4 de 5">
      <li id="mensaje-5" ... aria-label="5 de 5">  {/* mensaje + chip bg-beige-100 con el logo */}
    </ul>
  </div>

  {/* Fila compartida (única, no dentro del loop de slides): flecha-prev · 5 dots · flecha-next. */}
  <MissionCarouselLive />

  <a href="#catalogo" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-sage-500 px-6 py-3 text-beige-50 hover:bg-sage-600">
    Ver catálogo →
  </a>
</section>
```

`MissionCarouselLive` es quien renderiza la fila compartida completa
(flechas + dots), no un componente aparte "invisible" montado al margen —
así los dots (que sí deben existir sin JS) y las flechas (que no) viven en
un único árbol donde es fácil razonar el `mounted`-gating descripto abajo.
Los dots son anclas reales `<a href="#mensaje-N">`, presentes siempre
(server-rendered, no dependen de ningún estado de cliente); las flechas
son las que están condicionadas por `mounted`.

**Por qué esto resuelve el problema de raíz (no solo lo acota), siguiendo
`ux.md`:**

- **Sin JS (o mientras no corrió el primer efecto):** cero controles de
  flecha operables. El contenedor de scroll (`role="region" tabIndex={0}`)
  ya es enfocable en el HTML base — una vez que recibe foco (Tab o click),
  las flechas de teclado izquierda/derecha lo desplazan de forma
  **nativa del navegador** (comportamiento estándar de un contenedor con
  `overflow` y foco), sin necesitar ningún botón. Los 5 dots cubren el
  salto directo a cualquier mensaje. Swipe/scroll de trackpad/rueda
  funcionan igual. Nada de esto depende de hidratación.
- **Con JS:** se agrega un único set de 2 `<button>` (prev/next), que
  actúan sobre el contenedor de scroll (`scrollIntoView` del `<li>`
  vecino), más `aria-current` en el dot activo (`IntersectionObserver`) y
  una región `aria-live="polite"` que anuncia el mensaje activo.

**Cómo se implementa el "aparecen sin mover nada" (anti-CLS) sin recurrir
a un mecanismo nuevo en el repo (decisión de implementación que cierra lo
que `ux.md` deja abierto):**

`MissionCarouselLive` (`"use client"`) renderiza los 2 `<button>` de
flecha **siempre en su JSX** (mismo nodo, misma posición en el árbol,
tamaño fijo `h-11 w-11` = 44px), pero gateados por un estado `mounted`
(`useState(false)` → `true` en un `useEffect` que corre una sola vez tras
montar — patrón estándar de Next.js para "solo tras hidratar", ya usado
implícitamente por cualquier componente cliente con efectos en este
stack):

- Mientras `!mounted` (incluye: SSG/SSR, y JS deshabilitado permanentemente
  — en ese caso `mounted` nunca pasa a `true`): el botón lleva
  `className="invisible"` (`visibility: hidden`, no `hidden`/`display:none`
  — así reserva su espacio en el layout desde el primer render) y
  `tabIndex={-1}` (excluido del orden de tabulación) y **sin
  `aria-label`** (placeholder inerte, no anunciable). `visibility:hidden`
  además excluye el nodo del árbol de accesibilidad y de la lista de
  elementos enfocables — a efectos prácticos (lector de pantalla en "leer
  todo", orden de Tab, consultas por rol de Playwright/`testing-library`),
  el peor caso sigue siendo **0 controles de flecha**, tal como pide
  `ux.md`, aunque en el HTML crudo exista un nodo `<button>` inerte. Esto
  es más simple y robusto que remover/insertar el nodo del DOM
  (`createPortal` u otra técnica no usada hoy en el repo) y coincide
  literalmente con la instrucción de `ux.md`: *"el componente cliente solo
  alterna a `visibility: visible` tras montar — nunca inserta/remueve el
  nodo del DOM"*.
- Cuando `mounted` pasa a `true`: el botón cambia a `className="visible
  ..."`, recupera `tabIndex={0}` y su `aria-label` ("Mensaje anterior" /
  "Mensaje siguiente"), y su `onClick` (ya adjunto por React desde el
  primer render, simplemente inerte mientras estaba oculto/no-tabulable)
  dispara `scrollIntoView` del `<li>` vecino.
- Como el nodo nunca se inserta ni se remueve (solo cambian clases/atributos
  de un elemento que ya ocupaba su lugar en el layout), no hay reflow ni
  parpadeo de contenido vecino — cumple el requisito anti-CLS de `ux.md`
  sin necesitar medir tamaños en JS ni duplicar markup.

**Layout responsive de la fila compartida** (`ux.md` "Estados y
responsive"): en mobile, la fila es `flex items-center justify-center
gap-3` en flujo normal, debajo del `<ul>` — flecha-prev · dots · flecha-
next, con las flechas reservando 44px cada una aun invisibles (evita el
corrimiento de los dots que `ux.md` señala explícitamente como riesgo a
390px). En `sm:` y mayor, los dots quedan centrados en su propia fila
(`sm:justify-center`, sin flechas al lado) y las flechas pasan a
`sm:absolute sm:inset-y-0 sm:left-2`/`sm:right-2` sobre el contenedor de
scroll (círculo `sage-500/30`, hover), lo que además hace que su aparición
en desktop no tenga ningún riesgo de CLS por definición (`position:
absolute` ya está fuera del flujo, tal como señala `ux.md`) — el
`mounted`-gating de arriba sigue siendo necesario igual en ambos
breakpoints por consistencia de implementación (un solo componente, sin
lógica condicional por breakpoint en JS).

**Altura:** ninguna clase de altura fija en el contenedor de scroll ni en
`li` — el contenido manda (`ux.md` AC-6). El mensaje 2 (el más largo)
simplemente hace que esa `<li>` sea más alta.

**Navegación sin JS:** un click en cualquier dot (`#mensaje-N`) o en el
CTA (`#catalogo`) es navegación de hash nativa del navegador — el motor de
scroll nativo ya resuelve contenedores de scroll anidados (baja la
página *y* desplaza horizontalmente el contenedor para traer el `<li>`
destino a la vista), sin JS. `scroll-smooth` en CSS anima ese
desplazamiento; `motion-reduce:scroll-auto` lo vuelve instantáneo con
`prefers-reduced-motion` (`ux.md`).

## `MissionCarouselLive.tsx` (mejora progresiva, cliente)

`"use client"`, montado una sola vez dentro de `MissionSection`, al final
del contenedor de scroll. Renderiza el JSX de la fila compartida (flechas
+ dots) descripta arriba. Responsabilidades:

1. **`mounted`-gating de las 2 flechas** (ver arriba) — resuelve
   visibilidad + interactividad sin insertar/remover nodos del DOM.
2. **`IntersectionObserver`** sobre los 5 `<li>` (root = el contenedor de
   scroll, vía `ref`) → cuando cambia cuál está mayormente visible: (a)
   actualiza el texto de una región `aria-live="polite"` `sr-only`
   (renderizada por este mismo componente) a `"Mensaje N de 5"`; (b) marca
   `aria-current="true"` en el dot correspondiente (los dots también los
   renderiza este componente, así que esto es estado de React normal, sin
   manipulación directa del DOM de un árbol ajeno).
3. **Teclado delegado** (`ArrowLeft`/`ArrowRight`): un `onKeyDown` en el
   contenedor visual que envuelve contenedor-de-scroll + fila compartida
   (captura eventos que burbujean desde el contenedor, las flechas o los
   dots) hace `scrollIntoView` del `<li>` vecino con el mismo mecanismo que
   usan las flechas — refinamiento sobre el scroll nativo por foco+overflow
   que ya cubre el caso base sin JS (más preciso: snapea exacto al mensaje
   siguiente en vez de un scroll delta arbitrario).

Si esta pieza no se llega a hacer bien en el tiempo estimado, **ningún AC
deja de cumplirse** (contenido, dots y navegación por scroll/swipe/teclado
nativo ya funcionan sin ella) — sigue siendo el primer candidato a
recortar si el estimate se ajusta (ver `tasks.md`), con la diferencia de
que ahora "recortarla" significa simplemente no montarla (los dots y el
contenedor enfocable son responsabilidad de `MissionSection`, no de este
componente) en vez de dejar flechas duplicadas sueltas.

## `src/app/page.tsx`

Sin cambios respecto a la versión anterior de este plan:

```tsx
import { MissionSection } from "@/components/MissionSection";
// ...imports existentes...

export default function Home() {
  const products = getAllProducts();
  return (
    <div className="flex flex-col">
      <MissionSection />

      <div className="my-10 border-t border-beige-200 sm:my-16" />

      <div id="catalogo" className="flex scroll-mt-4 flex-col gap-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-sage-800">
          Catálogo
        </h2>
        <CategoryNav />
        <CatalogView products={products} />
      </div>
    </div>
  );
}
```

**Detalle importante a no perder en `tasks.md`:** el heading "Catálogo"
hoy es `<h1>`, que hereda Cormorant Garamond gratis vía el selector CSS
`h1, .font-display` de `globals.css`. Al bajarlo a `<h2>` hay que
agregarle la clase `.font-display` a mano o **pierde silenciosamente su
tipografía** — esto no es un AC nuevo, es no-regresión visual, y por eso
es su propio ítem verificable en `tasks.md`.

`h1` del mensaje 1 vive *dentro* de `MissionSection` (con
`id="mision-heading"`, referenciado por el `aria-labelledby` de la
`<section>`) — sigue habiendo un único `h1` por página (accesibilidad,
`ux.md`).

## Cómo se testea cada AC

| AC | Tipo | Cómo |
|---|---|---|
| AC-1 | e2e | En `/`, el único `h1` de la página tiene el texto del mensaje 1, y aparece *antes* que el `h2` "Catálogo" en el orden del DOM (`page.locator("h1, h2").allTextContents()` → `[mensaje1, "Catálogo"]`). |
| AC-2 | unit | `mission-content.test.ts`: los 5 textos de `MISSION_SLIDES` son exactamente los de "Contenido fuente" de `spec.md` (protege contra copy drift). `mission-section.test.tsx` (`renderToStaticMarkup`, mismo patrón que `offer-badge.test.tsx`): el HTML estático contiene los 5 textos, sin ningún `<img>` de foto/bio de fundadora. |
| AC-3 | unit + e2e | Unit: el HTML estático incluye exactamente un `<img alt="RenovArte">` dentro del slide 5. E2e: `page.getByRole("img", {name: "RenovArte"})` visible al llegar a `#mensaje-5` (además de la del header — se filtra por el contenedor de la sección). |
| AC-4 | e2e (regresión) | Ninguna de las specs 0001/0003/0004/0005 se modifica — correr `tests/e2e/catalog.spec.ts` completo confirma que sigue en verde. Se agrega un assert de orden: el bloque `#catalogo` aparece después de la sección de misión en el DOM. |
| AC-5 | unit + manual | `no-stray-hex.test.ts` (ya existente, escanea `src/components/**`/`src/app/**`) cubre los archivos nuevos automáticamente — 0 hex sueltos. Revisión manual (checklist en `tasks.md`): ningún `<img>` de stock/captura de Instagram en el código. |
| AC-6 | e2e + manual | E2e: reusa el patrón de "no horizontal scroll a 390px" ya existente en `catalog.spec.ts`, ahora aplicado a la home con la sección de misión adentro. Manual: captura visual a 390/768/1280 revisando que el mensaje 2 (el más largo) no se corte ni se superponga con la fila de dots/flechas, y que la aparición de las flechas tras hidratar no desplaza esa fila (anti-CLS, revisado 2026-09-14). |
| AC-7 | unit + e2e | Unit: el HTML estático (`renderToStaticMarkup`, sin ejecutar ningún efecto de cliente — equivale exactamente al escenario "JS nunca corre") contiene los 5 `<li role="group" aria-roledescription="slide">` con su texto, el contenedor con `role="region" tabIndex="0"`, los 5 dots (`<a href="#mensaje-N">`), y **cero** elementos con `aria-label` "Mensaje anterior"/"Mensaje siguiente" — prueba directa de "accesible sin JS" y de "0 flechas en el peor caso". E2e (`browser.newContext({ javaScriptEnabled: false })`): ir a `/`, click en el dot `href="#mensaje-3"`, assert `page.url()` termina en `#mensaje-3` y ese `<li>` queda en viewport; además `page.getByRole("button", { name: /Mensaje (anterior|siguiente)/ })` tiene `count() === 0` — `getByRole` consulta el árbol de accesibilidad, así que esto confirma que el botón `invisible`/`tabIndex=-1` no es alcanzable aunque exista como nodo inerte en el HTML crudo. E2e adicional (Chromium, único browser configurado — ver "Riesgos"): foco directo en el contenedor de scroll + `ArrowRight` de teclado desplaza al mensaje 2, sin flechas visibles (confirma el scroll nativo por foco+overflow que reemplaza a las flechas en el estado base). |
| AC-8 | e2e | Click en "Ver catálogo" → `page.url()` termina en `#catalogo` y `page.locator("#catalogo").getByRole("heading", {level:2, name:"Catálogo"})` queda en viewport (`toBeInViewport()`). |

## Consideraciones para el futuro (nota de riesgo de `spec.md`)

Sin cambios. `MissionSection` es un componente autocontenido, montado una
sola vez en `page.tsx`. Agregar más adelante un bloque de "quién está
detrás de RenovArte" (foto/bio de Juli) es tan simple como agregar otro
`<section>` hermano entre `MissionSection` y el separador hairline, sin
tocar el carrusel ni el catálogo — el diseño no cierra esa puerta, tal
como pide la nota de riesgo de `spec.md`.

## Riesgos / decisiones a confirmar antes de implementar (revisado 2026-09-14)

1. **`mounted`-gating de las flechas + `IntersectionObserver` sincronizado
   con los dots es una técnica que el repo no usó antes** (aunque cada
   pieza por separado — componente cliente, `useEffect`, observers — es
   estándar). Es la mayor fuente de incertidumbre del estimate, reemplaza
   al riesgo de "afinar flechas duplicadas por breakpoint" de la versión
   anterior de este plan, que ya no aplica (no hay flechas duplicadas que
   afinar).
2. **Hallazgo sobre Safari/iOS (Pregunta abierta #3 de `ux.md`),
   verificado antes de cerrar este plan:** el mecanismo base sin JS
   depende de que un contenedor con `overflow`/`scroll-snap` y
   `tabIndex="0"` reciba foco por Tab y luego responda a las flechas de
   teclado — comportamiento estándar en Chrome/Firefox, pero **Safari en
   macOS, por configuración por defecto, solo incluye enlaces y controles
   de formulario en el orden de tabulación** ("Full Keyboard Access" está
   desactivado de fábrica); un `<div tabIndex="0">` no es alcanzable con
   Tab a menos que el usuario active esa preferencia (System Settings →
   Keyboard → Keyboard navigation) o use Option+Tab. Es un comportamiento
   documentado de WebKit, distinto al de Chromium/Gecko, no algo que este
   plan pueda verificar corriendo un navegador real en este entorno
   (tampoco hay proyecto WebKit en `playwright.config.ts` — solo
   `chromium`, ver abajo). Consecuencia concreta: en Safari macOS con
   configuración por defecto, y probablemente en iPadOS Safari con teclado
   externo (mismo motor), la mejora de "Tab hasta el contenedor + flechas
   de teclado nativas" puede no ser alcanzable — **no rompe AC-7** (swipe,
   scroll, dots y CTA siguen funcionando igual en Safari, nada de eso
   depende de este mecanismo), pero sí la paridad de teclado que promete
   `ux.md` en ese navegador puntual. iOS Safari sin teclado externo no
   tiene un concepto de "Tab" para tocar de todos modos; VoiceOver navega
   por sus propios gestos (rotor/swipe), no por Tab/flechas, así que para
   usuarios de VoiceOver en iPhone esto es irrelevante en la práctica.
   **Decisión:** no se agrega ningún workaround de JS para forzar foco o
   emular el comportamiento de Safari (iría contra el principio de mejora
   progresiva del propio diseño y sumaría complejidad no pedida por
   ningún AC) ni se agrega un proyecto Playwright WebKit a
   `playwright.config.ts` como parte de este plan (cambio de
   infraestructura de testing más amplio que esta feature, se deja como
   posible follow-up separado si el CTO/CEO quiere cobertura cross-browser
   automatizada en general). Se agrega en su lugar un paso de **QA manual**
   explícito en `tasks.md` (T15) para confirmar/documentar el
   comportamiento real en Safari macOS e iPad Safari antes del cierre de
   la Fase 4 — si resulta inconsistente, queda anotado como limitación
   conocida de WebKit, no como un AC incumplido.
3. **Fondo/textura (Pregunta abierta #1):** sin cambios — este plan la
   resuelve con tokens existentes (`sage-50` + chip `beige-100` para el
   logo, ver arriba); se marca como *cerrada* salvo que el CTO/CEO, antes
   de aprobar, prefiera pedir un asset de textura propio en su lugar.
