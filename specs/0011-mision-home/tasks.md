# 0011 — Sección de misión/nosotros como centro de la home · Tasks

> **Revisión 2026-09-14.** Reemplaza las tasks de la versión anterior que
> implementaban flechas prev/next duplicadas por slide (anchors), siguiendo
> la enmienda del mismo día a `ux.md` (decisión CTO/CEO: agregar JS para
> resolver la duplicación de raíz). Los tasks de contenido/copy (T1-T2),
> estructura base del carrusel sin controles (T3-T5), `page.tsx` (T9),
> gate y cierre (T16-T17) no cambian en su intención, solo se renumeran
> donde corresponde. Los tasks de controles (antes T6, T10) y sus checks
> de e2e (antes T13) cambian de contenido. Se agrega un task nuevo de
> verificación de teclado nativo (T14) y una verificación explícita de
> Safari/iOS en el cierre (T16).

## Estimate

**Tamaño: M — 6 a 10 horas (aprox. 1 a 1.5 días). Sin cambios respecto al
estimate anterior** — menos HTML/anchors duplicados para escribir y
testear (no hay flechas por slide), pero el componente cliente
(`MissionCarouselLive.tsx`) es algo más elaborado que en el diseño
anterior (`mounted`-gating anti-CLS + `IntersectionObserver` + teclado
delegado, en vez de solo `aria-current`/teclado sobre un fallback que ya
existía en HTML). Ambos efectos se compensan; el tamaño global no cambia.

**Top riesgos que podrían romper el estimate (revisados):**

1. El `mounted`-gating de las 2 flechas (`visibility:hidden` +
   `tabIndex=-1` hasta montar, sin insertar/remover el nodo) sincronizado
   con el `IntersectionObserver` que marca `aria-current` en los dots es
   una combinación de técnicas que el repo no usó antes — reemplaza al
   riesgo de "afinar flechas duplicadas por breakpoint" de la versión
   anterior (ya no aplica: no hay flechas duplicadas). Puede llevar
   vueltas de ida y vuelta para que la fila compartida (flecha·dots·flecha
   en mobile) no salte al pasar de invisible a visible.
2. `MissionCarouselLive.tsx` no tiene cobertura de test unitario posible
   en este repo (entorno `vitest` es `node`, sin DOM/jsdom) — su
   corrección solo se confirma manualmente o de forma indirecta en e2e; si
   se complica, es el primer candidato a recortar (ningún AC depende de
   él, ver `plan.md`).
3. **Nuevo:** la paridad de teclado nativo (Tab hasta el contenedor +
   flechas) puede no ser consistente en Safari/iOS por defecto (WebKit
   solo incluye links/form controls en el orden de Tab de fábrica — ver
   "Riesgos" en `plan.md`). No bloquea AC-7 (swipe/scroll/dots siguen
   funcionando) y no hay proyecto Playwright WebKit en este repo para
   detectarlo automáticamente — se verifica a mano en T16, no cambia el
   estimate salvo que la verificación manual encuentre algo que obligue a
   repensar el mecanismo (bajo riesgo, dado que no es la única vía de
   navegación).

## Sin dependencia de layout final (contenido y datos primero)

- [x] T1 — `src/lib/mission-content.ts`: `MISSION_SLIDES` con los 5
  mensajes exactos de "Contenido fuente" (`spec.md`). **Check:**
  `pnpm typecheck`.
- [x] T2 — `tests/unit/mission-content.test.ts`: los 5 textos de
  `MISSION_SLIDES` son exactamente los de `spec.md` (protege contra copy
  drift), en el orden 1→5 (AC-2). **Check:** `pnpm test` (nuevo test en
  verde).

## Estructura del carrusel (server component, sin controles todavía)

- [x] T3 — `src/components/MissionSection.tsx`: `<section
  aria-labelledby="mision-heading">` con un contenedor de scroll `<div
  role="region" tabIndex={0} aria-label="Mensajes de misión, usa las
  flechas del teclado para recorrer">` envolviendo un `<ul>` de 5 `<li
  id="mensaje-N" role="group" aria-roledescription="slide" aria-label="N
  de 5">`, mensaje 1 como `<h1 id="mision-heading">`, mensajes 2-4 como
  `<p className="font-display">`, sin dots ni flechas todavía. Fondo
  `bg-sage-50 rounded-lg`. **Check:** `pnpm build`.
- [x] T4 — `tests/unit/mission-section.test.tsx` (patrón
  `renderToStaticMarkup`, como `offer-badge.test.tsx`): el HTML estático
  contiene los 5 textos de `MISSION_SLIDES`, hay un único `<h1>`, el
  contenedor de scroll tiene `role="region"` y `tabIndex="0"`, y no
  contiene ningún `<img>` de foto/bio de fundadora (AC-2, AC-7 parcial).
  **Check:** `pnpm test`.
- [x] T5 — Slide 5: agregar el mensaje 5 + chip `bg-beige-100 rounded-lg
  p-4` envolviendo `<Image src="/brand/logo.svg" alt="RenovArte">` (AC-3).
  **Check:** extender T4 — el HTML estático tiene exactamente un `<img
  alt="RenovArte">` dentro del slide 5; `pnpm test` en verde.
- [x] T6 — Fila de **5 dots compartidos** (anclas reales `<a
  href="#mensaje-1..5">`, `aria-label` "Ir al mensaje N de 5", sin
  `aria-current` todavía) directamente en `MissionSection.tsx`, después
  del contenedor de scroll (AC-7 base — sin flechas todavía, esas viven en
  T10/`MissionCarouselLive`). **Check:** extender T4 — el HTML estático
  tiene los 5 `<a href="#mensaje-N">` con su `aria-label`, y **cero**
  elementos con `aria-label` "Mensaje anterior"/"Mensaje siguiente"
  (confirma el "0 flechas sin JS" de `ux.md`, ver `plan.md`); `pnpm test`.
- [x] T7 — CTA "Ver catálogo" (`href="#catalogo"`, texto + flecha,
  estilo `bg-sage-500`/`hover:bg-sage-600`/`text-beige-50`/`rounded-lg`)
  después de la fila de dots (AC-8). **Check:** extender T4 — el HTML
  estático tiene el link con ese `href` y ese texto; `pnpm test`.

## Responsive + `page.tsx`

- [x] T8 — Clases responsive del contenedor de scroll (`flex snap-x
  snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto`;
  `li`: `w-full shrink-0 snap-center`), fila de dots (`flex
  items-center justify-center gap-3`, `sm:justify-center`), sin alto fijo
  en el contenedor ni en `li` (AC-6, AC-7 base). **Check:** `pnpm build`;
  smoke visual local en 390/768/1280 (`pnpm dev`) — el mensaje 2 no se
  corta ni se superpone con la fila de dots.
- [x] T9 — `src/app/page.tsx`: mover `MissionSection` primero, agregar
  separador hairline + espacio mayor, bajar el heading "Catálogo" a `<h2
  id="catalogo" className="font-display ...">` (**sin perder la
  tipografía Cormorant** — ver nota en `plan.md`), envolver el bloque de
  catálogo en `<div id="catalogo" className="scroll-mt-4 ...">`. **Check:**
  `pnpm build` + correr `tests/e2e/catalog.spec.ts` completo (specs
  0001/0003/0004/0005) → sigue en verde sin cambios (AC-4, no regresión).

## Mejora progresiva (cliente) — recortable si el tiempo aprieta

- [x] T10 — `src/components/MissionCarouselLive.tsx` (`"use client"`,
  montado dentro de `MissionSection`, junto a la fila de dots — ver
  `plan.md`): 2 `<button>` de flecha (prev/next) con
  `className="invisible"`/`tabIndex={-1}`/sin `aria-label` mientras
  `!mounted` (estado `useState(false)` → `true` en un `useEffect` que
  corre una sola vez), pasando a `visible`/`tabIndex={0}`/`aria-label`
  ("Mensaje anterior"/"Mensaje siguiente") una vez montado — el nodo nunca
  se inserta ni se remueve (anti-CLS, ver `plan.md`). `onClick` hace
  `scrollIntoView` del `<li>` vecino. **Check:** `pnpm build` +
  `pnpm typecheck`; verificación manual con DevTools (deshabilitar JS): el
  carrusel sigue funcionando por swipe/scroll/dots/teclado nativo del
  contenedor, y los botones de flecha no aparecen ni son alcanzables por
  Tab.
- [x] T11 — Extender `MissionCarouselLive.tsx`: `IntersectionObserver`
  sobre los 5 `<li>` (root = el contenedor de scroll) que marca
  `aria-current="true"` en el dot activo (estado de React, mismo
  componente renderiza los dots) y actualiza el texto de una región
  `aria-live="polite"` `sr-only` ("Mensaje N de 5"); listener de teclado
  delegado (`ArrowLeft`/`ArrowRight`) sobre el contenedor de la fila
  compartida + contenedor de scroll, que hace `scrollIntoView` del `<li>`
  vecino (refinamiento sobre el scroll nativo por foco, no reemplazo).
  **Check:** `pnpm build` + `pnpm typecheck`; verificación manual: el dot
  activo se marca al hacer scroll manual, y las flechas de teclado
  funcionan con foco en el contenedor, una flecha o un dot.

## Verificación end-to-end (AC-1, AC-6, AC-7, AC-8)

- [x] T12 — `tests/e2e/catalog.spec.ts`: nuevo test de orden — en `/`, el
  único `h1` tiene el texto del mensaje 1 y aparece antes que el `h2`
  "Catálogo" (AC-1); el bloque `#catalogo` aparece después de la sección
  de misión. **Check:** `pnpm test:e2e` (test nuevo en verde).
- [x] T13 — `tests/e2e/catalog.spec.ts`: extender/agregar el test de "sin
  scroll horizontal a 390px" en home para que siga pasando con la sección
  de misión adentro (AC-6). **Check:** `pnpm test:e2e`.
- [x] T14 — `tests/e2e/catalog.spec.ts`: dos tests nuevos (AC-7):
  1. Con `browser.newContext({ javaScriptEnabled: false })` — ir a `/`,
     click en el dot `href="#mensaje-3"`, assert `page.url()` termina en
     `#mensaje-3` y ese slide queda en viewport; además
     `page.getByRole("button", { name: /Mensaje (anterior|siguiente)/
     })` tiene `count() === 0` (confirma "0 flechas" también a nivel del
     árbol de accesibilidad, no solo del HTML estático — ver `plan.md`).
  2. Con JS habilitado (contexto normal, Chromium): foco directo en el
     contenedor de scroll (`page.locator('[role="region"]').focus()`) +
     `keyboard.press("ArrowRight")` desplaza al mensaje 2 — prueba el
     scroll nativo por foco+overflow que reemplaza a las flechas en el
     estado base (único browser cubierto por el gate automatizado, ver
     "Riesgos" en `plan.md` sobre Safari/iOS).
  **Check:** `pnpm test:e2e` (ambos tests nuevos en verde).
- [x] T15 — `tests/e2e/catalog.spec.ts`: nuevo test — click en "Ver
  catálogo", `page.url()` termina en `#catalogo`, y el `h2` "Catálogo"
  queda en viewport (`toBeInViewport()`) (AC-8). **Check:** `pnpm test:e2e`.

## Cierre

- [ ] T16 — QA manual: (a) responsive a 390/768/1280 (mismo ritual que
  0006 T12): confirmar que el mensaje 2 no se corta ni se superpone con la
  fila de dots/flechas a 390px, que las flechas no desplazan esa fila al
  aparecer tras hidratar (anti-CLS), que el logo del slide 5 se ve sobre
  fondo claro, y que ningún archivo nuevo usa foto de stock ni captura de
  Instagram (AC-5, AC-6); (b) **Safari/iOS (Pregunta abierta #3 de
  `ux.md`):** en Safari de macOS, confirmar si Tab llega al contenedor de
  scroll con la configuración por defecto y, si no, si activar "Full
  Keyboard Access" lo resuelve; probar lo mismo en iPad Safari con teclado
  externo si hay uno disponible; documentar el resultado en este archivo o
  en el reporte de cierre — si no es consistente, no bloquea AC-7 (swipe/
  dots/scroll siguen andando) pero se anota como limitación conocida de
  WebKit, no como task pendiente de arreglo (no hay proyecto Playwright
  WebKit en este repo para automatizarlo, ver `plan.md`).

  **Resultado (2026-09-14, developer agent):** (a) **hecho** — a 390px el
  mensaje 2 (el más largo) ocupa 3 líneas sin cortarse ni superponerse con
  la fila de dots/CTA (verificado con capturas); anti-CLS confirmado por
  medición programática: `boundingBox()` del primer dot es idéntico
  (`x/y/width/height`) antes de que corra JS y 500ms después de hidratar;
  el logo del slide 5 se ve sobre el chip `bg-beige-100` claro; ningún
  archivo nuevo usa `<img>` de stock/Instagram (solo `logo.svg`, confirmado
  también por `mission-section.test.tsx`). (b) **no verificado** — este
  entorno no tiene Safari de macOS ni un iPad físico/simulador disponibles
  para el agente, y no se instaló el browser WebKit de Playwright porque
  automatizarlo no reproduce fielmente la configuración de "Full Keyboard
  Access" por defecto que es justamente lo que hay que confirmar (correr
  Playwright-WebKit no responde la pregunta real). Queda como limitación
  conocida documentada, no como AC incumplido (ver `plan.md` "Riesgos" —
  swipe/scroll/dots ya cubren AC-7 independientemente de este mecanismo) —
  pendiente de que el CTO/CEO lo confirme a mano en su propio Mac/iPad
  antes del cierre de la Fase 4.
- [x] T17 — `pnpm gate` verde (lint, build, typecheck, unit, `check:leak`,
  e2e completo).
- [x] T18 — `specs/README.md`: fila 0011 → `Built` (con el conteo real de
  unit/e2e agregados); traceability matrix RF-11/RF-12 → `Built`.
