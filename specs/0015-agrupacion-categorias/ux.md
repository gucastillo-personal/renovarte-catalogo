# 0015 — Agrupación de categorías en dos niveles · UX

**Mockup:** https://claude.ai/artifact/R1EqDfqrVGxk4fuuQ6FDWD (maqueta interactiva de
revisión — datos de producto/conteos son de ejemplo, marcados como tales en la propia
página; nombres de grupo y de categoría sí son los reales del spec/catálogo de hoy).

Este documento revisa y reemplaza, con criterio de UX, el layout que `plan.md` había
fijado por su cuenta (ver nota en su encabezado: "no existe `ux.md`... el diseño queda
para este `plan.md`"). La estructura general de dos filas de chips que ese plan ya
implementó en código (`CategoryNav` + `GroupCategoryNav`) es correcta y se conserva;
lo que este documento cambia es (a) cómo se distinguen visualmente nivel 1 de nivel 2,
(b) cómo se resuelve la pertenencia de un producto/categoría a más de un grupo — un
hecho de negocio confirmado *después* de que `plan.md` se escribió, que invalida uno
de sus supuestos explícitos — y (c) el criterio de resaltado activo en `/categoria/[slug]`
cuando esa ambigüedad aparece. Ver "Divergencias respecto de `plan.md`" al final.

## Layout

Dos filas de chips, apiladas verticalmente, cada una en su propio `flex flex-wrap` —
confirmo la estructura que ya está en código (`CategoryNav.tsx` + `GroupCategoryNav.tsx`),
es el patrón correcto para una fila de filtros mobile-first sin scroll horizontal
(mismo criterio que spec 0003 ya probó a 390px). Cambio solo el tratamiento visual de
nivel 2 y dónde vive cada cosa:

- **Nivel 1 (grupo):** fila existente `CategoryNav` — "Todos", "Ofertas" (si hay
  productos en oferta, sin cambios de spec 0005), y un chip por cada grupo de
  `getGroupList()` en el orden de negocio fijo 1→2→3→4, **omitiendo cualquier grupo
  con 0 productos** (confirmo el criterio de `plan.md`, ver `## Grupo "Otros"` abajo).
  Estilo sin cambios: chip lleno (`CHIP`/`ACTIVE`/`INACTIVE`/`OFFERS` de
  `docs/brand.md`, ya extraídos a `chip-styles.ts`). **Condición importante, nueva
  respecto de lo ya implementado:** esta fila de grupos solo reemplaza a la lista
  plana cuando `getGroupList()` no está vacío. Mientras no haya ningún grupo real
  (`getGroupList().length === 0` — hoy, Fase 1, antes de que `renovarte-pipeline`
  publique `codCategoria`), `CategoryNav` **no se vacía a solo "Todos"/"Ofertas"**:
  se degrada exactamente al comportamiento de spec 0003 (Todos, Ofertas, y un chip
  por cada categoría específica, alfabético, sin nivel 2) — ver
  `## Acceso directo a una categoría específica desde /` para el porqué completo, que
  incluye la resolución de un conflicto real de e2e que encontró el developer-agent.
- **Nivel 2 (categoría específica dentro del grupo):** fila nueva `GroupCategoryNav`,
  renderizada **debajo** de nivel 1, **solo** en `/grupo/[slug]` y en
  `/categoria/[slug]` — nunca en `/` (confirma AC-1 literal: por defecto no se ve
  ninguna lista de categorías, ni la vieja plana de 24 ni una nueva). Dos cambios
  concretos respecto del código actual, para que nivel 2 se lea como *subordinado* a
  nivel 1 y no como "otra fila de chips igual a la de arriba" (hoy usan exactamente el
  mismo componente visual, sin ninguna pista de jerarquía para un usuario vidente —
  solo el `aria-label` distingue las dos filas, y eso solo lo oye un lector de
  pantalla):
  1. Una etiqueta visible, pequeña, versalita, sobre la fila: **"Categorías"** (o
     "Categorías de {nombre del grupo}" cuando el contexto lo pide — ver más abajo),
     mismo tratamiento tipográfico que "SPA DE PIEL" en `docs/brand.md`
     (`uppercase`, `tracking` amplio, `text-xs`, `text-sage-600`). Hoy ese texto solo
     existe como `aria-label`, invisible para usuarios videntes.
  2. Chips de nivel 2 un escalón más chicos que los de nivel 1 (`text-xs` en vez de
     `text-sm`, mismo padding proporcionalmente reducido), **mismos tokens de color**
     (`sage-100`/`sage-500`/`sage-700` — no se introduce ningún color nuevo). El
     tamaño, no el color, es lo que comunica "esto está anidado bajo lo de arriba".

En la página de producto (`/producto/[id]`), la fila de metadata existente (hoy: chip
de `categoria` + badge de oferta) se extiende con un chip más por cada grupo al que el
producto pertenece, **reusando el mismo estilo ya existente del chip de categoría**
(sin inventar una variante nueva ahí — ver `## Multi-grupo` para el porqué). Orden:
chip de categoría (sin cambios) → chip(s) de grupo, en el orden de negocio 1→2→3→4 →
badge de oferta (sin cambios, sigue al final).

## Acceso directo a una categoría específica desde `/` (1 click vs. 2 clicks)

Esto responde al conflicto que encontró el developer-agent al implementar T11: sacar
los chips de categoría específica de nivel 1 rompe 2 suites e2e preexistentes de spec
0003 (`catalog.spec.ts:88` y `:98`), que asumen que desde `/` se llega a una categoría
específica en un solo click. `tasks.md` pedía que esas 2 suites quedaran en verde "sin
modificar", algo incompatible con la lectura literal de AC-1 si nivel 1 deja de
mostrar categorías siempre. Decisión, con la distinción que el conflicto no había
hecho todavía — **entre dos momentos reales y distintos de este feature**:

- **Una vez que existan grupos reales** (`getGroupList()` no vacío — Fase 2, cuando
  `renovarte-pipeline` publique `codCategoria`): sí, el flujo pasa a ser de dos clicks
  (elegir grupo → elegir categoría dentro de ese grupo) en vez de uno. Esto **es** el
  punto del spec, no un efecto secundario a mitigar — es lo que pide la definición de
  negocio del CTO/CEO (separar primero por tipo general) y lo que exige AC-1 literal
  ("no ve una lista plana que mezcla categorías de todos los grupos"). No propongo un
  atajo nuevo (autocomplete, buscador por categoría, hover-flyout) para evitar ese
  segundo click: (a) un desplegable en hover no sirve en mobile, que es la prioridad
  de diseño de este catálogo (RNF-04, "mobile-first" — `specs/constitution.md` §III.10),
  así que agregarlo solo para desktop crea una inconsistencia entre dispositivos, que
  es exactamente el tipo de cosa que este spec busca evitar; (b) reintroducir la lista
  plana de 24 detrás de un "ver todo" recrea el problema de negocio original (mezclar
  categorías de grupos distintos sin distinción) aunque sea opcional, no por defecto.
  Dos clicks bien resueltos (chips reales, sin recarga completa gracias al prefetch de
  `Link`, con URL propia en cada paso) es una jerarquía de navegación estándar y
  esperable, no una regresión.
- **Mientras no existan grupos reales** (`getGroupList()` vacío — hoy, y cualquier
  momento futuro en que esa condición se repita): nivel 1 **no se vacía**. Se degrada
  exactamente a la fila plana de categorías específicas de spec 0003 — el mismo
  componente/comportamiento que existía antes de este spec, sin ningún cambio visual
  ni de click — en vez de mostrar solo "Todos"/"Ofertas" sin ninguna forma de navegar
  por categoría. Esto es, en rigor, lo que el propio `plan.md` ya prometía para Fase 1
  ("todo lo demás (`/`, `/categoria/*`, búsqueda, ofertas) sigue exactamente igual que
  antes") — pero T11, tal como está escrita y ya implementada, saca la lista plana
  **incondicionalmente**, sin ese fallback, lo cual contradice esa promesa del propio
  plan y es la causa real del conflicto que encontró el developer-agent. La corrección
  es agregar la condición, no reescribir los tests.

**Consecuencia concreta para los 2 tests de spec 0003 en conflicto:** con esta regla,
**no hace falta tocarlos ahora**. Con los datos reales de hoy (`getGroupList()` vacío,
porque `renovarte-pipeline` todavía no publicó `codCategoria`), nivel 1 sigue
mostrando la lista plana completa, así que `catalog.spec.ts:88` ("home shows the
category nav") y `:98` ("picking a category filters the grid...") seguirían pasando
sin modificar un carácter — exactamente lo que pedía `tasks.md`. Lo que sí hay que
tocar es la aserción nueva que el developer-agent ya escribió en este mismo ciclo
(`catalog.spec.ts:136`, "home no longer shows any specific-category chip in nivel 1"):
está escrita sobre la premisa incorrecta (remoción incondicional) y hoy afirma
exactamente lo contrario de lo que este diseño pide para el estado sin grupos. Como es
código de este mismo ciclo, todavía no mergeado (T10–T17 están pausadas), corregirla
ahora no es "reescribir un test existente" sino terminar de escribirla bien la primera
vez. **Sí van a hacer falta cambios de test, pero recién en Fase 2** (ya previsto en
`tasks.md` T20, "verificar AC-1: nivel 1 visible, sin lista plana por defecto"): ahí,
con datos reales y `getGroupList()` no vacío, hay que (a) mover/adaptar la aserción de
`catalog.spec.ts:136` para que se cumpla de verdad (nivel 1 sin categorías específicas)
contra datos reales, y (b) en ese momento sí, actualizar `:88`/`:98` de spec 0003 para
reflejar que, con grupos reales, el flujo pasa a ser de dos clicks — ver
`tasks.md` T20 y agregar explícitamente esos dos tests a su alcance. Dejo esto anotado
como trabajo autorizado de esta feature, no como scope nuevo no pedido.

**Alternativa considerada y descartada — extender el buscador (RF-03) para machear
también contra `categoria`, no solo `nombre`/`tags`:** técnicamente barata (un campo
más en `matchProducts`) y le da a alguien que ya sabe el nombre de la categoría una
vía de un solo campo de texto para encontrar esos productos sin navegar chips. La dejo
como mejora opcional, de baja prioridad, a criterio del CTO/CEO — no la exijo porque
no resuelve lo mismo que un chip (no ofrece descubrimiento para quien no sabe el
nombre de la categoría de antemano, y no lleva a la URL `/categoria/[slug]` dedicada)
y agrega alcance no pedido por el spec.

## Multi-grupo: un producto (o una categoría) puede estar en más de un grupo

Dato de negocio confirmado por el CTO/CEO contra la API real (posterior a `plan.md`):
un producto puede pertenecer a más de un grupo a la vez, y lo mismo puede pasar con
una categoría específica completa (ej. "Antiage" puede tener productos tanto en
Cuidado facial como en Cuidado corporal). Esto no es una jerarquía estricta — es más
parecido a una etiqueta múltiple que a una carpeta única. Decisión de UX, con su
razonamiento:

1. **En la grilla: el producto aparece igual, sin ninguna marca, en cada grupo al que
   pertenece.** No hay badge de "también en Cuidado corporal" en `ProductCard`.
   Motivos:
   - Consistencia: la misma card debe verse igual sin importar por qué chip/URL
     llegó el usuario a ella. Es literalmente el problema que este spec busca
     resolver (RF-13: dejar de sentir el catálogo como una mezcla inconsistente) —
     agregar una etiqueta que cambia según el contexto de navegación reintroduce esa
     misma inconsistencia por otra vía.
   - Espacio/ruido: `ProductCard` ya usa la esquina superior para `OfferBadge`. Si la
     doble pertenencia resulta común (los dos ejemplos de la maqueta — un sérum
     reafirmante rostro+cuerpo, un aceite multiuso — sugieren que no es un caso raro),
     un badge de "también en X" terminaría apareciendo en una fracción real de las
     cards, sumando ruido a toda la grilla en vez de ayudar.
2. **En la ficha de producto (`/producto/[id]`) sí se declara toda la pertenencia**,
   agregando un chip por grupo junto al chip de categoría ya existente (ver
   `## Layout`). Es el lugar correcto: el usuario ya está leyendo el detalle completo,
   no escaneando una grilla, así que un dato adicional no compite por atención con
   nada más. Si el producto pertenece a 1 solo grupo (el caso más común, se espera),
   esto se ve exactamente igual que hoy más un chip — sin cambio de comportamiento
   perceptible.
3. **Los conteos de grupo pueden solaparse.** La suma de `count` de los 4 grupos puede
   superar `getAllProducts().length` en cuanto un producto cuenta para más de un
   grupo. Esto es esperado, no un bug — dejarlo explícito para que nadie lo "corrija"
   más adelante pensando que es un error de conteo.
4. **`/categoria/[slug]` cuando la categoría en sí pertenece a más de un grupo.** La
   URL de categoría no lleva grupo (decisión ya tomada en `plan.md`, la mantengo: los
   slugs de categoría son únicos en todo el catálogo, no hace falta anidar la ruta).
   Con multi-pertenencia confirmada, puede pasar que una categoría (ej. "Antiage")
   pertenezca a 2 grupos a la vez. Regla de resaltado en nivel 1:
   - Si la categoría pertenece a **exactamente un** grupo (caso esperado más común):
     ese chip de nivel 1 se resalta como activo — comportamiento idéntico al de hoy.
   - Si pertenece a **0 o 2+** grupos: **ningún** chip de nivel 1 se resalta. Elegí
     esto en vez de resaltar varios chips a la vez a propósito: varios chips "activos"
     simultáneamente en una fila que hasta ahora siempre mostró un único estado activo
     se lee como un estado raro/roto tanto para un usuario vidente como para
     `aria-current="page"` (que semánticamente describe "estás acá", no "esto
     pertenece a varios acás"). Nivel 2 sigue marcando sin ambigüedad la categoría
     activa (`aria-current="page"` sobre su propio chip), así que la selección real
     del usuario nunca queda sin indicar — solo se pierde el resaltado de nivel 1 en
     el caso ambiguo, que es información secundaria.
   - Nivel 2, en ese mismo caso ambiguo, muestra la **unión** de las categorías
     específicas de todos los grupos a los que pertenece la categoría actual
     (deduplicada por slug), no solo las de uno elegido arbitrariamente — así el
     usuario sigue viendo categorías relacionadas coherentes en vez de una lista
     recortada por una regla de desempate invisible.

## Estado por defecto / "Todos" / convivencia con RF-02

- El chip **"Todos"** (ya existe, `href="/"`) sigue siendo la vuelta a la vista sin
  restricción de grupo ni categoría, visible en nivel 1 en todas las páginas (home,
  `/grupo/*`, `/categoria/*`) — confirma AC-3, sin cambios sobre el chip ya
  implementado.
- El buscador de texto (RF-03, spec 0004) **no cambia**: sigue filtrando, en el
  cliente, sobre la lista de productos que la página ya cargó — todos en `/`, el
  grupo en `/grupo/[slug]`, la categoría en `/categoria/[slug]`. Es decir, buscar
  dentro de un grupo ya filtrado sigue acotado a ese grupo, exactamente como hoy
  buscar dentro de una categoría queda acotado a esa categoría. No hay ningún filtro
  nuevo (composición, necesidad, uso) que reconciliar — están fuera de alcance del
  spec y no se tocan.

## Grupo "Otros" (fallback)

Confirmo el criterio que ya propuso `plan.md`: **el chip de nivel 1 de "Otros" se
oculta si su conteo es 0**, mismo criterio que ya usa "Ofertas" en `CategoryNav`. No
propongo mostrarlo siempre vacío ni darle un tratamiento visual distinto (outline,
color apagado, etc.) cuando sí tiene productos — debe verse exactamente igual que
"Cuidado facial"/"Cuidado corporal"/"Cosmética" cuando aparece, para no sugerirle al
usuario que es una categoría "de segunda". Su posición ya queda última por el orden
fijo `CATEGORY_GROUP_IDS` (1→2→3→4), que es señal suficiente de que es el grupo
residual sin necesitar un estilo distinto.

Nota aparte de AC-6 (no confundir con "Otros"): un producto con `codCategoria`
ausente o no reconocido — dato inesperado, no el fallback `"4"` en sí — debe seguir
visible en "Todos" sin desaparecer silenciosamente, y **no** cuenta para ningún chip
de grupo (ni siquiera "Otros"). La maqueta incluye un ejemplo de este caso
("Kit de Regalo") separado del toggle de "Otros", justamente para no confundir ambos
casos.

## Responsividad / 390px

Confirmo la fila doble con `flex-wrap` como la solución correcta (AC-5: no genera
scroll horizontal a 390px, mismo patrón ya probado por la e2e de spec 0003). Aviso
explícito que no estaba en `plan.md`: a 390px, nivel 1 (hasta 6 chips: Todos, Ofertas,
4 grupos) más nivel 2 (variable según cuántas categorías tenga el grupo elegido)
pueden ocupar juntas 3 a 5 filas antes de que empiece la grilla — el buscador y la
grilla de productos pueden quedar debajo del pliegue en la primera carga de
`/grupo/[slug]`. Esto no viola ningún AC (AC-5 es sobre scroll horizontal, no sobre
qué tan abajo queda la grilla), así que no lo bloqueo, pero lo marco como trade-off
aceptado dado que son ~24 categorías repartidas en pocos grupos — y es exactamente
por lo que nivel 2 usa chips más chicos que nivel 1 (ver `## Layout`), para reducir
esa altura en vez de agravarla.

## Accesibilidad

- Dos regiones `<nav>` con `aria-label` distintos: nivel 1 mantiene
  `aria-label="Categorías"` (sin cambios); nivel 2 usa
  `aria-label="Categorías de {nombre del grupo}"` — en el caso ambiguo de
  `## Multi-grupo` punto 4, el label pasa a listar los grupos unidos (ej.
  "Categorías de Cuidado facial + Cuidado corporal").
- `aria-current="page"` sobre el chip activo en cada fila — en nivel 1 nunca hay más
  de un chip con `aria-current` a la vez (ver regla de resaltado arriba); en nivel 2,
  siempre exactamente el chip de la categoría actual cuando corresponde.
- Sin JS: cada chip es un `<Link>`/`<a>` real, no un widget — funciona igual con JS
  deshabilitado o antes de hidratar, no hay contenido que dependa de JavaScript para
  aparecer (a diferencia de un carrusel, acá no hace falta ningún fallback especial
  porque no hay nada dinámico del lado del cliente más allá del buscador ya existente
  de spec 0004, que no cambia).
- Chips de grupo en la ficha de producto: mismo `<Link>` a `/grupo/[slug]`, mismo
  nivel de accesibilidad que el chip de categoría existente (foco visible, contraste
  ya validado en `docs/brand.md`).

## Content mapping

- Nombres de grupo: exactamente los 4 ya decididos en `spec.md` §"Grupos (decidido)"
  — "Cuidado facial", "Cuidado corporal", "Cosmética", "Otros" (este último sugerido,
  no confirmado formalmente — ver Preguntas abiertas). No se inventa copy nueva.
- Nombres de categoría específica: sin cambios, los mismos `categoria` de
  `products.json` de hoy.
- Ninguna etiqueta nueva de marketing — la única copy nueva de interfaz es la
  etiqueta "Categorías" / "Categorías de {grupo}" sobre nivel 2 (texto funcional de
  navegación, no copy de marca).

## Open questions

1. **Bloqueante para Fase 2, no para este documento:** el modelo de datos actual
   (`Product.codCategoria?: string`, valor único, con `deriveCategoriaGrupoMap`
   resolviendo categoría→grupo por voto mayoritario) **no puede representar** que un
   producto o una categoría pertenezcan a más de un grupo — y ya sabemos que eso pasa
   de verdad. Este diseño asume que `codCategoria` (o el campo que lo reemplace) va a
   poder exponer **más de un id por producto** — la forma exacta (¿array de strings?
   ¿mantener el campo actual más uno opcional "secundario"?) es una decisión técnica
   que le toca al developer-agent, coordinada con el spec espejo de
   `renovarte-pipeline` (0001), que hoy también describe `codCategoria` como valor
   único. Sin ese cambio de esquema, nada de `## Multi-grupo` es implementable tal
   como está diseñado acá.
2. **Nombre del grupo "Otros":** sigue sin confirmación final del CTO/CEO (spec.md,
   Preguntas abiertas #2). Diseñé usando "Otros" porque es el nombre de trabajo que ya
   usan tanto `spec.md` como el spec espejo de `renovarte-pipeline` — no bloqueante,
   pero falta el ok final antes de que Fase 2 lo publique así.
3. **Distribución real producto↔categoría↔grupo:** desconocida hasta que
   `renovarte-pipeline` publique datos reales (Fase 2). Mi recomendación de nivel 2
   más chico para mitigar densidad a 390px (`## Responsividad`) es un default
   razonable, pero conviene revisarla con conteos reales — mismo riesgo #4 que ya
   señalaba `plan.md`.
4. **Ningún asset visual nuevo hace falta** para este spec: se reusa `ProductCard` y
   los íconos/paleta existentes tal cual — no hay pregunta abierta de assets acá.

## Divergencias respecto de `plan.md`

- **Visual:** nivel 2 pasa de ser visualmente idéntico a nivel 1 (mismo chip, mismo
  tamaño, sin etiqueta visible) a tener una etiqueta eyebrow visible y chips un
  escalón más chicos — mismos tokens de color, sin RFC de marca nuevo.
- **Modelo de datos (el cambio más importante):** `plan.md` diseñó
  `deriveCategoriaGrupoMap` explícitamente como voto mayoritario, asumiendo — y
  dejándolo anotado como riesgo #2 sin confirmar — que una categoría pertenece a un
  único grupo. Ese supuesto ya se confirmó **falso** contra la API real (dato que
  llegó después de `plan.md`). El developer-agent va a tener que rediseñar esa parte
  del plan (esquema de `codCategoria`, `deriveCategoriaGrupoMap`,
  `deriveGroupList`/`getProductsByGrupo`) para soportar pertenencia múltiple en vez de
  voto mayoritario — no es un ajuste menor, es la pieza central de "Datos" en
  `plan.md` la que cambia.
- **`/categoria/[slug]` con ambigüedad de grupo:** `plan.md` no contemplaba este caso
  porque asumía categoría→grupo 1:1. La regla de resaltado de `## Multi-grupo` punto 4
  es enteramente nueva, no estaba en `plan.md`.
- **Ficha de producto:** `plan.md` no tocaba `/producto/[id]`. Este documento agrega
  chip(s) de grupo ahí — cambio de alcance chico pero real sobre un archivo que el
  plan técnico no mencionaba.
- **`CategoryNav` en `/` cuando no hay grupos todavía:** `plan.md` (línea 271) y la
  T11 ya implementada sacan la lista plana de categorías de forma **incondicional**,
  afirmando en el mismo documento (línea ~33) que "todo lo demás (`/`...) sigue
  exactamente igual que antes" en Fase 1 — las dos afirmaciones son contradictorias, y
  es lo que le rompió al developer-agent 2 suites e2e preexistentes de spec 0003 al
  implementar T11 literalmente. Este documento resuelve la contradicción a favor de la
  segunda promesa (Fase 1 no cambia `/` hasta que haya datos reales que agrupar): la
  remoción de la lista plana pasa a ser **condicional** a `getGroupList().length > 0`.
  Ver `## Acceso directo a una categoría específica desde /` para el detalle completo
  y la consecuencia sobre los tests. Esto requiere ajustar T11/T12/T17 de `tasks.md` —
  no elimina esas tareas, cambia su criterio de aceptación.
