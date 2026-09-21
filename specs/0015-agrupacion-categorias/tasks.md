# 0015 — Agrupación de categorías en dos niveles · Tasks

## Estimate

**Tamaño: L — 8 a 13 horas de trabajo de ingeniería, repartidas en dos
fases separadas por una dependencia externa sin fecha propia.**

- **Fase 1 (construible y testeable ahora, sin el pipeline): ~6-9 horas.**
  Es más grande que specs comparables recientes (0012 = S, 1.5-3h; 0013 =
  M, 4-7h) porque suma, no solo edita: dos módulos de librería nuevos
  (`category-groups.ts` — solo ids/orden, no nombres — y funciones nuevas
  en `products.ts` con una capa pura + un loader tolerante del archivo de
  nombres + una capa cacheada), un componente nuevo (`GroupCategoryNav`),
  una ruta SSG nueva (`/grupo/[slug]`), un refactor de `CategoryNav`
  existente (saca las 24 categorías, agrega grupos), y la redacción de la
  enmienda RFC-0001 §2.4 (ya escrita en este ciclo de diseño, incluida su
  revisión post-CTO/CEO sobre quién es la fuente de verdad del mapeo de
  nombres).
- **Fase 2 (bloqueada por `renovarte-pipeline` spec 0001, hoy Backlog):
  ~2-4 horas**, una vez ese spec publique `codCategoria` (vía PR a
  `public/data/products.json`) **y** `serlaca_category_groups.json` (vía
  PR a `public/data/serlaca_category_groups.json`, mecanismo nuevo — ver
  `plan.md` "Sincronización con renovarte-pipeline" y el riesgo #1 abajo).
  No tiene fecha de inicio propia — depende de cuándo se implemente y
  mergee ese spec, y su ajuste de `publish/run.py`, en el otro repo.

**Top riesgos que podrían mover el estimate:**

1. **Coordinación de `publish/run.py` con `renovarte-pipeline`, todavía
   no resuelta del otro lado** (`plan.md` "Riesgos" #1). El `plan.md`
   actual de `renovarte-pipeline` marca `pipeline/publish/*` como "no
   tocado a propósito" — sumar la copia de
   `serlaca_category_groups.json` contradice esa nota y requiere que ese
   repo actualice su propio plan/tasks. No es una tarea de este
   `tasks.md` (no se resuelve tocando el otro repo desde acá), pero
   bloquea Fase 2 igual que la falta de `codCategoria` en sí.
2. **Timing y forma real de la dependencia cruzada.** Si al verificar
   contra la API real de Serlaca (AC-1 del spec del pipeline) aparece un
   caso donde una `categoria` específica queda repartida entre más de un
   `codCategoria` —contradiciendo el supuesto 1:1 de
   `deriveCategoriaGrupoMap`, ver `plan.md` "Riesgos" #2— Fase 2 dejaría
   de ser solo "conectar y verificar" y pasaría a necesitar una decisión
   de diseño nueva, que se reportaría en vez de improvisarse.
3. **Distribución real desconocida hasta Fase 2** (`plan.md` "Riesgos"
   #4): si un grupo de negocio (no el fallback) resulta con muy pocos
   productos reales, la UX podría necesitar una revisión del CTO/CEO
   fuera del alcance de este `tasks.md`.

## Tasks

### Fase 1 — construible y testeable hoy (sin `renovarte-pipeline`)

- [x] **T1.** Crear `src/lib/category-groups.ts`: `CATEGORY_GROUP_IDS`,
  `CodCategoria`, `isCodCategoria` — **solo** ids/orden/tipo, sin ningún
  nombre visible (esos vienen del archivo publicado por el pipeline, no
  de este módulo — ver `plan.md`). *Check:* `pnpm build` sigue verde.
- [x] **T2.** Crear `tests/unit/category-groups.test.ts`: `isCodCategoria`
  hit/miss; `CATEGORY_GROUP_IDS` tiene exactamente 4 elementos en el
  orden `["1","2","3","4"]`. *Check:* `pnpm test
  tests/unit/category-groups.test.ts` en verde.
- [x] **T3.** En `src/lib/types.ts`: agregar `codCategoria?: string` a
  `Product` (con el comentario de `plan.md` sobre por qué es opcional y
  laxo), sumarlo a `OPTIONAL_PRODUCT_KEYS`, y extender `isProduct` para
  aceptar `codCategoria` ausente o `string` (sin validar contra
  `isCodCategoria` en el parse boundary). *Check:* `pnpm build` y `pnpm
  typecheck` siguen verdes; `pnpm test tests/unit/types.test.ts` sigue
  verde sin editarlo todavía (T5 lo extiende).
- [x] **T4.** En `src/lib/types.ts`: agregar
  `validateGroupNames(raw: unknown): Partial<Record<CodCategoria, string>>`
  tal como especifica `plan.md` (lanza si `raw` no es un objeto plano;
  descarta en silencio claves no reconocidas o valores vacíos, sin
  lanzar por eso). *Check:* `pnpm build` sigue verde.
- [x] **T5.** Extender `tests/unit/types.test.ts`: `isProduct` acepta un
  producto sin `codCategoria` (como los de hoy), acepta uno con
  `codCategoria: "9"` (valor no reconocido, no debe rechazarlo), y rechaza
  uno con `codCategoria` no-string; `validateGroupNames` acepta un objeto
  con las 4 claves válidas, descarta una clave desconocida sin lanzar,
  descarta un valor vacío sin lanzar, y lanza si `raw` no es un objeto
  (ej. un array). *Check:* mismo comando, en verde.
- [x] **T6.** En `src/lib/products.ts`: agregar las funciones puras
  `deriveCategoriaGrupoMap` y `deriveGroupList(products, groupNames)` (+
  tipo `GroupEntry`), tal como especifica `plan.md`. *Check:* `pnpm build`
  sigue verde.
- [x] **T7.** Extender `tests/unit/products.test.ts` con fixtures en
  memoria (arrays de `Product` y objetos de nombres literales, sin tocar
  `public/data/products.json`) para `deriveCategoriaGrupoMap` (voto por
  mayoría, empate determinista, productos sin grupo no votan) y
  `deriveGroupList` (conteo por grupo, orden fijo 1→2→3→4, grupo con
  count 0 omitido, `nombre` cae al id crudo cuando `groupNames` no tiene
  esa clave). *Check:* `pnpm test tests/unit/products.test.ts` en verde.
- [x] **T8.** En `src/lib/products.ts`: agregar el loader tolerante
  `loadGroupNames()` (lee `public/data/serlaca_category_groups.json`,
  `catch` a `{}` si el archivo no existe todavía, valida con
  `validateGroupNames` si existe) y los wrappers cacheados `getGroupList`,
  `grupoFromSlug`, `getGrupoSlug`, `getGrupoNombre`, `getProductsByGrupo`,
  `getCategoriaGrupo`, `getCategoryListForGroup`, alimentados por
  `load()` + `loadGroupNames()` + las funciones puras de T6. *Check:*
  `pnpm build` sigue verde (confirma que la ausencia real de
  `public/data/serlaca_category_groups.json` hoy no rompe el build).
- [x] **T9.** Extender `tests/unit/products.test.ts`: contra el archivo
  real de hoy (sin ningún `codCategoria`, sin
  `public/data/serlaca_category_groups.json`), `getGroupList()` da `[]`,
  `grupoFromSlug("cuidado-facial")` da `undefined`, `getGrupoSlug("1")` da
  `undefined`, `getGrupoNombre("1")` da `"1"` (fallback al id crudo, sin
  nombre resuelto), `getProductsByGrupo("1")` da `[]`,
  `getCategoriaGrupo(<cualquier categoría real>)` da `undefined`,
  `getCategoryListForGroup("1")` da `[]` — ninguno lanza. *Check:* mismo
  comando, en verde; este test documenta y fija el comportamiento de
  degradación de AC-6 mientras duren ambas dependencias con el pipeline
  (`codCategoria` y el archivo de nombres).
- [x] **T10.** Extraer `CHIP`/`ACTIVE`/`INACTIVE`/`OFFERS` de
  `CategoryNav.tsx` a `src/lib/chip-styles.ts` (+ `CHIP_SM` y `TAG_CHIP`,
  agregados por `ux.md`); `CategoryNav.tsx` los importa de ahí en vez de
  definirlos localmente. *Check:* `pnpm test tests/unit/category-nav.test.tsx`
  en verde.

  > **Historial de este task (referencia, no bloqueante):** T10–T18 se
  > pausaron dos veces durante este ciclo — primero (2026-09-18) porque el
  > diseño visual de nivel 2 se había resuelto en `plan.md` sin pasar por
  > el `ux-agent`, y luego un conflicto real de e2e (T11 vs. el check de
  > T17) que el `ux-agent` resolvió en `ux.md` §"Acceso directo a una
  > categoría específica desde `/`": la remoción de la lista plana de
  > nivel 1 es **condicional** a `getGroupList().length > 0`, no
  > incondicional como la primera versión de T11 la había implementado.
  > Con esa corrección, T10–T18 están completas, el `ux.md` aprobado por
  > el CTO/CEO está aplicado, y las 2 suites e2e de spec 0003
  > (`catalog.spec.ts:88`/`:98`) pasan **sin haber sido tocadas**. Detalle
  > completo de la corrección en cada task de abajo.
- [x] **T11.** Editar `CategoryNav.tsx`: nivel 1 muestra un chip por cada
  entrada de `getGroupList()` **solo cuando esa lista no está vacía**;
  mientras esté vacía (Fase 1, hoy — sin `codCategoria` real todavía),
  degrada exactamente al `categories.map(...)` de spec 0003 (lista plana
  de categorías específicas, alfabética, un click desde `/`) — condición
  agregada en `ux.md` sobre la versión original de este task, que sacaba
  la lista plana incondicionalmente y por eso rompía las suites e2e de
  spec 0003. Prop `activeGrupoSlug?: string` para resaltar el chip de
  grupo activo cuando sí hay grupos; `activeSlug` sigue resolviendo
  "Todos"/"Ofertas" **y**, en la rama de fallback, la categoría específica
  activa (igual que antes de este spec). *Check:* `pnpm build` sigue
  verde.
- [x] **T12.** Actualizar `tests/unit/category-nav.test.tsx`: el test AC-1
  original (chip de categoría con el par de tokens `sage-100`/`sage-700`)
  sigue en verde tal cual, porque con datos de hoy (`getGroupList()`
  vacío) ese chip específico se sigue renderizando (rama de fallback); se
  agrega un test que confirma esa rama de fallback explícitamente (nivel 1
  muestra `/categoria/*`, no muestra `/grupo/*`, mientras no haya grupos
  reales). La rama "con grupos reales" (nivel 1 muestra `/grupo/*`, ya no
  `/categoria/*`) se cubre en un archivo nuevo,
  `tests/unit/category-nav-with-groups.test.tsx`, con `@/lib/products`
  mockeado (`vi.mock`) porque no se puede ejercitar contra datos reales
  hasta Fase 2. *Check:* `pnpm test tests/unit/category-nav.test.tsx
  tests/unit/category-nav-with-groups.test.tsx` en verde.
- [x] **T13.** Crear `src/components/GroupCategoryNav.tsx` (nivel 2), con
  las correcciones de `ux.md` sobre la versión original de este task:
  etiqueta visible versalita ("Categorías de {grupo(s)}", mismo
  tratamiento que "SPA DE PIEL" en `docs/brand.md`) enlazada por
  `aria-labelledby` (no solo `aria-label`, para que la jerarquía nivel
  1/nivel 2 se lea también sin lector de pantalla); chips en `CHIP_SM`
  (un escalón más chicos que nivel 1, mismos tokens de color); prop
  `grupos: CodCategoria[]` (array, no un único id — soporta el caso
  ambiguo de `ux.md` "Multi-grupo" punto 4, unión de categorías
  deduplicada por slug); `getCategoryListForGrupos(grupos)`. *Check:*
  `pnpm build` sigue verde.
- [x] **T14.** Crear `tests/unit/group-category-nav.test.tsx`
  (`renderToStaticMarkup`): con datos de hoy, `<GroupCategoryNav
  grupos={[]} />` no renderiza nada; `<GroupCategoryNav grupos={["1"]} />`
  renderiza una fila vacía sin lanzar, con la etiqueta visible cayendo al
  id crudo ("Categorías de 1"); `<GroupCategoryNav grupos={["1","2"]} />`
  concatena los ids con " + " — comentario en el test apuntando a T19
  (Fase 2) que lo extiende con aserciones de contenido real. *Check:*
  `pnpm test tests/unit/group-category-nav.test.tsx` en verde.
- [x] **T15.** Crear `src/app/grupo/[slug]/page.tsx` (mismo esqueleto que
  `categoria/[slug]/page.tsx`): `dynamicParams = false`,
  `generateStaticParams` desde `getGroupList()`, `generateMetadata`,
  `notFound()` si el slug no resuelve, `<CategoryNav
  activeGrupoSlug={slug} />` + `<GroupCategoryNav grupos={[id]} />` +
  `<CatalogView products={getProductsByGrupo(id)} />`. *Check:* `pnpm
  build` sigue verde; con datos de hoy no genera ninguna página
  `/grupo/*` (esperado, documentado en `plan.md`).
- [x] **T16.** Editar `src/app/categoria/[slug]/page.tsx`: calcular
  `grupos = getCategoriaGrupos(categoria)` (array — 0, 1 o 2+, corrección
  de `ux.md` "Multi-grupo" sobre el `getCategoriaGrupo` singular
  original); `grupoActivo = grupos.length === 1 ? grupos[0] : undefined`
  pasado a `<CategoryNav activeGrupoSlug>` (0 o 2+ grupos no resalta
  ningún chip de nivel 1, por diseño de `ux.md` punto 4); `<GroupCategoryNav
  grupos={grupos} activeCategoriaSlug={slug} />` siempre (se auto-omite si
  `grupos` es `[]`). *Check:* `pnpm build` sigue verde; con datos de hoy
  la página se ve igual que antes de este spec (`grupos` es siempre `[]`).
- [x] **T16b (agregada — `ux.md` "Multi-grupo").** Editar
  `src/app/producto/[id]/page.tsx`: el chip de `categoria` pasa a usar
  `TAG_CHIP` (extraído de su clase inline original); se agrega un chip por
  cada grupo de `codCategoriasOf(product)`, mismo estilo `TAG_CHIP`, orden
  categoría → grupo(s) en orden de negocio → badge de oferta. No estaba en
  el `plan.md` original — `ux.md` lo agrega explícitamente. *Check:* `pnpm
  build` sigue verde.
- [x] **T17.** Extender `tests/e2e/catalog.spec.ts`: `/grupo/no-existe` →
  404; sin scroll horizontal a 390px en `/` con las filas nuevas (AC-5); y
  — corregido por `ux.md` sobre la versión original de este task — `/`
  **sigue** mostrando la lista plana de categorías específicas mientras
  `getGroupList()` esté vacío (hoy), no al revés. *Check:* `pnpm test:e2e`
  en verde, incluidas las suites existentes de spec 0001/0003/0004/0005/0007
  **sin modificar** (confirmado: `catalog.spec.ts:88` y `:98` pasan tal
  cual estaban, sin editar un carácter).
- [x] **T18.** Correr el gate completo: `pnpm gate`. *Check:* verde (lint,
  build, typecheck, unit — 109 tests, 1 skip —, `check:leak`, e2e — 28
  passed, 2 skipped —) — cierra Fase 1.

### Fase 2 — bloqueada hasta que `renovarte-pipeline` publique `codCategoria` en `products.json` **y** `serlaca_category_groups.json`

> No empezar estas tareas hasta que existan **ambos** PRs mergeados de
> `renovarte-pipeline`: `public/data/products.json` con `codCategoria`
> poblado (array de strings — schema cerrado del lado del pipeline
> 2026-09-18, gate verde, 151 tests), y
> `public/data/serlaca_category_groups.json` con los 4 nombres (este
> segundo requiere que `renovarte-pipeline` extienda su `publish/run.py` —
> ver riesgo #1 arriba; si todavía no lo hizo, no es algo para resolver
> desde este repo, es la coordinación pendiente a reportar). El supuesto
> 1:1 categoria↔grupo del `plan.md` original (`deriveCategoriaGrupoMap`
> como voto mayoritario) ya se confirmó **falso** contra la API real — una
> `categoria` puede pertenecer a 2+ grupos a la vez (`ux.md`
> "Multi-grupo") — y el código de este repo ya se adaptó a esa
> confirmación (`deriveCategoriaGrupoMap`/`deriveGroupList` trabajan sobre
> `codCategoria: string[]`, no un id único); lo que falta en Fase 2 es
> solo verificar con datos reales, no rediseñar de nuevo.

- [x] **T19.** Extender `tests/unit/group-category-nav.test.tsx` y
  `tests/unit/products.test.ts` con aserciones de contenido real (grupo
  con productos reales, conteos, nombres resueltos desde el
  `serlaca_category_groups.json` real — no el fallback al id crudo,
  `getCategoryListForGrupos` no vacío; al menos un caso real, si existe,
  de una `categoria` perteneciendo a 2+ grupos, para confirmar la regla de
  `ux.md` "Multi-grupo" punto 4 contra datos reales y no solo fixtures).
  *Check:* tests en verde contra los dos archivos reales ya actualizados.
- [x] **T20.** Extender `tests/e2e/catalog.spec.ts`: elegir un grupo real
  con productos, verificar AC-1 (nivel 1 visible, sin lista plana por
  defecto en `/` — ahora sí, porque `getGroupList()` deja de estar vacío),
  AC-2 (grilla y nivel 2 acotados al grupo elegido), AC-5 a 390px con la
  cantidad real de chips del grupo más grande, y AC-6 si existe algún
  producto real con `codCategoria` ausente/vacío/no reconocido (sigue
  visible en `/`). **Incluye explícitamente** (agregado por `ux.md`
  "Acceso directo a una categoría específica desde `/`", autorizado como
  parte de esta misma feature, no como scope nuevo):
  - (a) mover/adaptar `tests/unit/category-nav-with-groups.test.tsx` — hoy
    con fixture mockeada porque no había datos reales — a una aserción
    contra datos reales si es más simple, o dejarla como está si sigue
    aportando valor con fixture controlada.
  - (b) actualizar `tests/e2e/catalog.spec.ts:88` ("home shows the
    category nav") y `:98` ("picking a category filters the grid...") de
    spec 0003 para reflejar que, con grupos reales, acceder a una
    categoría específica desde `/` pasa a ser un flujo de **dos clicks**
    (elegir grupo → elegir categoría) en vez de uno — ya no aplica la
    excepción de "sin modificar" de T17, porque esa excepción dependía
    explícitamente de `getGroupList()` estar vacío, condición que Fase 2
    rompe a propósito.
  *Check:* `pnpm test:e2e` en verde.
- [x] **T21.** Correr el gate completo de nuevo: `pnpm gate`. *Check:*
  verde con datos reales — cierra Fase 2. (lint, build — incluye 3 páginas
  SSG `/grupo/*` — typecheck, 111 tests unitarios, `check:leak`, 31 tests
  e2e (1 skip, sin oferta flag-only hoy).)
- [x] **T22.** Actualizar `specs/README.md`: fila de la spec 0015 pasa de
  "Backlog — bloqueado por `renovarte-pipeline`" a "Built" (con conteo de
  tests), y la fila de RF-13 en la matriz de trazabilidad refleja el
  estado construido. *Check:* diff revisado, sin menciones colgantes de
  "Backlog" ni "bloqueado" para 0015/RF-13.
