# 0015 — Agrupación de categorías en dos niveles · Plan

Checado contra [`../constitution.md`](../constitution.md). Enmienda a
[RFC-0001 §2.4](../../docs/rfc/0001-arquitectura-catalogo.md) ya escrita
(campo público opcional `codCategoria` + ruta nueva `/grupo/[slug]`).

> **Enmienda (2026-09-18/20) — superada en dos puntos por `ux.md` y por el
> cierre del schema del lado de `renovarte-pipeline`; ver esos documentos
> para el detalle, no reescrito línea a línea acá:**
>
> 1. **Existe `ux.md`.** La sección `## UI` de abajo (y el diseño visual
>    del segundo nivel que describe) fue revisada por el `ux-agent`
>    *después* de escrito este plan y de una primera implementación —
>    `ux.md` es la versión vigente donde difieran. Cambios principales:
>    nivel 2 lleva una etiqueta visible ("Categorías de {grupo}") y chips
>    más chicos que nivel 1 (antes: visualmente idéntico a nivel 1); y la
>    fila de grupos de nivel 1 **reemplaza** la lista plana de categorías
>    solo cuando `getGroupList().length > 0` — mientras esa lista esté
>    vacía (Fase 1, hoy), `CategoryNav` se degrada exactamente al
>    `categories.map(...)` de spec 0003, sin ningún cambio visual ni de
>    click (la primera versión de este plan/su implementación sacaba esa
>    lista incondicionalmente, lo cual rompía 2 suites e2e preexistentes de
>    spec 0003 — ver `ux.md` "Acceso directo a una categoría específica
>    desde `/`").
> 2. **`codCategoria` es `list[str]`, no un id único.** El schema cerrado
>    del lado de `renovarte-pipeline` (spec 0001, 2026-09-18) — y un hecho
>    de negocio confirmado contra la API real de Serlaca *después* de
>    escrito este plan — es que un producto (y por lo tanto una
>    `categoria`) puede pertenecer a más de un grupo a la vez. Esto
>    invalida el supuesto 1:1 categoria↔grupo que `deriveCategoriaGrupoMap`
>    asumía abajo (voto mayoritario) — ver `ux.md` "Multi-grupo" para el
>    rediseño (unión de grupos, no un ganador único) y "Divergencias
>    respecto de `plan.md`" para el resumen completo de qué cambió y por
>    qué. El código ya implementa esta versión; lo que sigue abajo describe
>    la versión original, útil como contexto de diseño pero no como
>    referencia exacta del código actual.

No existe `ux.md` para este spec — el propio `spec.md` deja el diseño
visual concreto del segundo nivel explícitamente para este `plan.md` (ver
`spec.md` §Alcance/Out). Las decisiones de negocio (4 grupos, nombres,
mapeo de ids) están cerradas y no se re-discuten acá.

## Dependencia con `renovarte-pipeline` — cómo la maneja este plan

`codCategoria` no existe todavía en `public/data/products.json`, y
`public/data/serlaca_category_groups.json` (el archivo de nombres, única
fuente de verdad del lado de `renovarte-pipeline` — decisión del CTO/CEO,
ver `## Sincronización con renovarte-pipeline` más abajo) tampoco existe
todavía en este repo (spec espejo `renovarte-pipeline` 0001, Backlog).
Este plan separa el trabajo en dos fases explícitas:

- **Fase 1 — construible y testeable hoy, sin tocar `products.json`.**
  Schema, lógica de agrupación y componentes UI, con tests unitarios que
  usan **fixtures en memoria** (arrays de `Product` literales en el propio
  archivo de test) en vez de leer el archivo real — nunca se edita a mano
  `public/data/products.json` (constitution §I.2). Para que esto sea
  posible, la lógica de derivación de grupo se escribe como **funciones
  puras que reciben `Product[]` como parámetro**, no como métodos que leen
  el archivo directamente (ver `## Datos` más abajo) — un patrón nuevo
  respecto de `getCategoryList()` (spec 0003), que sí lee el archivo
  directo, precisamente para que esta fase no dependa del archivo real.
  Con datos de hoy (cero productos con `codCategoria`), el catálogo se
  degrada con gracia: cero grupos visibles, `/grupo/*` no genera páginas
  estáticas, y todo lo demás (`/`, `/categoria/*`, búsqueda, ofertas) sigue
  exactamente igual que antes — verificable con `pnpm gate` hoy mismo, sin
  esperar al pipeline.
- **Fase 2 — bloqueada hasta que `renovarte-pipeline` publique, vía PR,
  tanto `codCategoria` en `public/data/products.json` como los 4 nombres
  en `public/data/serlaca_category_groups.json`** (este segundo archivo
  requiere además que ese repo extienda su mecanismo de publicación —
  hoy solo copia `products.json`; ver `## Sincronización` y `tasks.md`
  "Riesgos" #1). Extender la suite e2e para ejercitar `/grupo/[slug]` con
  datos reales y confirmar AC-1/AC-2 con la distribución real de
  productos por grupo. El nombre del grupo `"4"` ya no es una pregunta
  abierta de este lado — el CTO/CEO lo confirmó ("Otros") del lado de
  `renovarte-pipeline`, que es quien lo publica. `tasks.md` marca estas
  tareas explícitamente como bloqueadas, no como parte del trabajo que se
  puede checkear ahora.

Este plan asume que `codCategoria` va a estar presente en el schema real
tal como lo describe el spec espejo del pipeline (`"1"`–`"4"`, string) una
vez implementado.

## Diseño de URL (resuelve AC-4)

No se agrega una ruta anidada `/grupo/[g]/categoria/[c]`. Los slugs de
`categoria` ya son únicos en todo el catálogo (spec 0003, `getCategoryList`
lanza en build si colisionan), así que una categoría específica ya es
alcanzable sin ambigüedad por `/categoria/[slug]` sin importar a qué grupo
pertenezca — el grupo es información **derivada**, no una parte necesaria
de la URL.

- `/` — sin filtro (como hoy). Nivel 1 visible (Todos / Ofertas / grupos),
  nivel 2 **no** visible (ver `## UI` — resuelve el AC-1 literal: por
  defecto ya no se ve la lista plana de 24 categorías).
- `/grupo/[slug]` — **nuevo**. Todos los productos de un grupo, sin
  categoría específica elegida. `slug` se deriva del **nombre** que llega
  en `public/data/serlaca_category_groups.json` (`"cuidado-facial"`,
  `"cuidado-corporal"`, `"cosmetica"`, `"otros"` con los nombres ya
  confirmados por el CTO/CEO), vía `slugifyCategoria` reusada (es una
  función de slugificación genérica pese al nombre — no se reescribe una
  nueva) — calculado en `deriveGroupList`/`getGroupList`, no en un
  constante estática de este repo (ver `## Datos`).
- `/categoria/[slug]` — **sin cambios de ruta** (spec 0003). Al renderizar,
  la página resuelve a qué grupo pertenece esa categoría y muestra nivel 1
  con ese grupo activo + nivel 2 acotado a las categorías de ese grupo, con
  la categoría actual activa.
- `/ofertas` — sin cambios (fuera de alcance; spec no pide separar ofertas
  por grupo).

`Todos` (chip existente, `href="/"`) sigue siendo la forma de volver a ver
todo sin restricción (AC-3) — no se toca.

## Datos (`src/lib/`)

**Cambio respecto de la primera versión de este plan (CTO/CEO,
2026-09-17):** `renovarte-pipeline` es la única fuente de verdad del
mapeo `codCategoria` → nombre de grupo — vive en
`data/reference/serlaca_category_groups.json` de ese repo (spec espejo
0001, `plan.md` §2), con los 4 nombres ya confirmados (`"1"` Cuidado
facial, `"2"` Cuidado corporal, `"3"` Cosmética, `"4"` Otros). Este repo
**no redefine esos nombres** — los recibe como dato, igual que recibe
`products.json`. Ver `## Sincronización con renovarte-pipeline` más abajo
para el mecanismo de copia y `## Riesgos` para la coordinación pendiente
que esto abre con el spec del pipeline.

### `src/lib/category-groups.ts` (nuevo, puro, client-safe — mismo espíritu que `category-slug.ts`)

Solo la forma/orden de los ids — **nunca los nombres**:

```ts
export const CATEGORY_GROUP_IDS = ["1", "2", "3", "4"] as const;
export type CodCategoria = (typeof CATEGORY_GROUP_IDS)[number];

export function isCodCategoria(value: string): value is CodCategoria {
  return (CATEGORY_GROUP_IDS as readonly string[]).includes(value);
}
```

Esta lista de 4 ids es un contrato estructural (qué valores puede tomar
`codCategoria`), no una decisión de copy de negocio — comparable a
`REQUIRED_PRODUCT_KEYS` en `types.ts` u `OPTIONAL_PRODUCT_KEYS`: ids
estables que ya están fijados en ambos specs (catálogo y pipeline), no un
texto visible que el CTO/CEO pueda querer renombrar. El **nombre** visible
de cada id (`"Cuidado facial"`, etc.) no está en este archivo — viaja en
`public/data/serlaca_category_groups.json` (ver abajo).

### `public/data/serlaca_category_groups.json` (nuevo — dato, no código; llega vía PR del pipeline)

Copia byte a byte del archivo homónimo de `renovarte-pipeline`
(`data/reference/serlaca_category_groups.json`), publicada por ese repo —
ver `## Sincronización` abajo. Mismo tratamiento que `products.json`:
público, committed, nunca editado a mano en este repo.

### `src/lib/products.ts` — loader del archivo de nombres + funciones de grupo

Mismo patrón que el loader de `products.json` (`server-only`,
`readFileSync` a build time, cacheado), pero **tolerante a que el archivo
todavía no exista** — no hay ningún PR previo del pipeline que lo haya
publicado hasta que termine su Fase 2:

```ts
const GROUP_NAMES_FILE = path.join(process.cwd(), "public", "data", "serlaca_category_groups.json");
let groupNamesCache: Partial<Record<CodCategoria, string>> | undefined;

function loadGroupNames(): Partial<Record<CodCategoria, string>> {
  if (groupNamesCache) return groupNamesCache;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(GROUP_NAMES_FILE, "utf-8"));
  } catch {
    // No publicado todavía por renovarte-pipeline (spec espejo 0001) — no
    // rompe el build mientras tanto (spec 0015, Fase 1).
    groupNamesCache = {};
    return groupNamesCache;
  }
  groupNamesCache = validateGroupNames(raw); // types.ts — ver abajo
  return groupNamesCache;
}
```

`validateGroupNames(raw: unknown): Partial<Record<CodCategoria, string>>`
(en `types.ts`, junto a `validateProducts`): lanza si `raw` no es un
objeto plano (forma del archivo rota — corrupción real, debe frenar el
build, igual criterio que `validateProducts` con el array de productos);
por cada clave, la conserva solo si es un `CodCategoria` reconocido
(`isCodCategoria`) y el valor es un string no vacío — una clave inesperada
o un valor vacío se descarta en silencio (no lanza) en vez de tirar el
build por un dato parcialmente malformado. Esto dejaría, por ejemplo, el
grupo `"4"` sin nombre resuelto si esa entrada puntual viniera mal, sin
afectar a los otros 3.

Dos capas para la lógica de agrupación: funciones **puras** (testeables
con fixtures en memoria, sin tocar ningún loader de archivo) y wrappers
cacheados que las alimentan con `load()` + `loadGroupNames()`, igual
patrón que `getCategoryList()` ya usa.

```ts
// puras — exportadas para tests con fixtures (Fase 1)
export function deriveCategoriaGrupoMap(products: Product[]): Map<string, CodCategoria>;
// Por cada `categoria` distinta, el codCategoria más frecuente entre sus
// productos (voto por mayoría; empate → el primero visto, para
// determinismo). Productos con codCategoria ausente/no reconocido no votan.
// Ver "Riesgo" más abajo sobre el supuesto 1:1 categoria↔grupo.

export function deriveGroupList(
  products: Product[],
  groupNames: Partial<Record<CodCategoria, string>>,
): GroupEntry[];
// { codCategoria, slug, nombre, count }[], en el orden fijo
// CATEGORY_GROUP_IDS (1,2,3,4 — no alfabético, a diferencia de
// getCategoryList; ver "UI"). `nombre` = groupNames[id] ?? id (fallback
// defensivo al id crudo si el archivo de nombres no lo resolvió — nunca
// lanza por un nombre faltante). Un grupo con count 0 se omite del
// resultado (mismo criterio que "Ofertas": `hasOffers && …` en
// CategoryNav hoy — responde la pregunta abierta original del spec de
// forma general, no solo para "4"). Recibe `groupNames` como parámetro
// (no lo lee por su cuenta) para que sea testeable con un mapa de fixture,
// igual que `products`.

// wrappers cacheados — leen products.json + serlaca_category_groups.json reales
export function getGroupList(): GroupEntry[];
export function grupoFromSlug(slug: string): CodCategoria | undefined;
export function getGrupoSlug(codCategoria: CodCategoria): string | undefined;
export function getGrupoNombre(codCategoria: CodCategoria): string;
// = getGroupList().find(g => g.codCategoria === codCategoria)?.nombre ?? codCategoria
export function getProductsByGrupo(codCategoria: CodCategoria): Product[];
export function getCategoriaGrupo(categoria: string): CodCategoria | undefined;
export function getCategoryListForGroup(codCategoria: CodCategoria): CategoryEntry[];
// = getCategoryList().filter(c => getCategoriaGrupo(c.nombre) === codCategoria)
```

`GroupEntry` en `src/lib/products.ts`, mismo estilo que `CategoryEntry` ya
existente:

```ts
export interface GroupEntry {
  codCategoria: CodCategoria;
  slug: string;
  nombre: string;
  count: number;
}
```

### `src/lib/types.ts` — `Product`

```ts
/**
 * Raw high-level group id from Serlaca ("1"-"4"), published by
 * renovarte-pipeline (spec 0001-agrupacion-alto-nivel-categorias).
 * Optional and untyped as a plain string (not the CodCategoria union) at
 * the parse boundary: an absent or unrecognized value must not fail
 * validation or hide the product from "Todos" (spec 0015 AC-6) — it's
 * resolved defensively to "no group" downstream, in src/lib/products.ts.
 */
codCategoria?: string;
```

Se agrega a `OPTIONAL_PRODUCT_KEYS` (no a `REQUIRED_PRODUCT_KEYS` — ver
"Riesgo" sobre por qué opcional, no obligatorio, a pesar de que el spec del
pipeline garantiza su presencia).

`isProduct`: si `codCategoria` está presente, debe ser `string` (igual
trato laxo que el resto de las claves string) — **no** se valida contra
`isCodCategoria` en el *parse boundary*; un valor no reconocido pasa la
validación de tipo y se resuelve a "sin grupo" en la capa de
`products.ts` (AC-6 literal).

## UI

Nivel 1 y nivel 2 son dos filas separadas (`flex flex-col gap-2`), cada una
un `flex flex-wrap gap-2` propio — el mismo patrón que `CategoryNav` ya usa
hoy y que la e2e de spec 0003 ya prueba sin scroll horizontal a 390px.
Ningún token de color nuevo: ambos niveles reusan exactamente los mismos
`CHIP`/`ACTIVE`/`INACTIVE`/`OFFERS` de `docs/brand.md` que spec 0012 ya
alineó — **no hace falta tocar `docs/brand.md`** (a diferencia de 0012/0013,
este spec no cambia apariencia de marca, solo agrega una fila). Se extraen
esas 4 constantes de `CategoryNav.tsx` a un módulo compartido
`src/lib/chip-styles.ts` para que el componente nuevo de nivel 2 no las
duplique.

### `CategoryNav.tsx` (nivel 1 — se edita, no se reescribe)

Se le saca el `categories.map(...)` (las 24 categorías) — eso pasa al
nuevo componente de nivel 2. Se le agrega, después del chip "Ofertas", uno
por cada entrada de `getGroupList()` (ya en el orden de negocio 1→2→3→4,
grupos con 0 productos no aparecen). Nueva prop:

```tsx
export function CategoryNav({
  activeSlug,       // ya existe: "ofertas" | undefined (Todos)
  activeGrupoSlug,  // nuevo: resalta el chip de grupo activo
}: { activeSlug?: string; activeGrupoSlug?: string }) { … }
```

`activeSlug` sigue resolviendo "Todos"/"Ofertas" exactamente igual que hoy
— no se toca esa parte. Esto es intencional: **por defecto (`/`, sin
`activeGrupoSlug`), ya no se renderiza ninguna lista de categorías
específicas** — eso es lo que responde el AC-1 literal ("no ve una única
lista plana que mezcla categorías de todos los grupos"). Antes de este
spec, `/` mostraba las 24 categorías siempre; después de este spec, `/`
solo muestra nivel 1.

### `GroupCategoryNav.tsx` (nivel 2 — nuevo)

```tsx
export function GroupCategoryNav({
  grupo,                 // CodCategoria
  activeCategoriaSlug,   // string | undefined
}: { grupo: CodCategoria; activeCategoriaSlug?: string }) { … }
```

Server component, mismo patrón que `CategoryNav`: `getCategoryListForGroup(grupo)`
→ fila de chips a `/categoria/<slug>`, `aria-current="page"` en el activo.
`aria-label="Categorías de {nombre del grupo}"` (distinto del `aria-label="Categorías"`
de nivel 1, para que un lector de pantalla distinga ambas filas como
regiones de navegación separadas) — el nombre viene de un wrapper nuevo
`getGrupoNombre(codCategoria): string` en `products.ts` (mismo fallback al
id crudo que `deriveGroupList` si el archivo de nombres no lo resolvió).

### Páginas

- `src/app/page.tsx`: sin cambios de props — `<CategoryNav />` sin
  `activeGrupoSlug` ya da el comportamiento nuevo (sin nivel 2) sin tocar
  este archivo.
- `src/app/categoria/[slug]/page.tsx`: agrega `const grupo =
  getCategoriaGrupo(categoria)`. Renderiza `<CategoryNav
  activeGrupoSlug={grupo && getGrupoSlug(grupo)} />` (nuevo wrapper
  `getGrupoSlug(codCategoria): string | undefined`, busca en
  `getGroupList()` — el slug ya viaja en `GroupEntry`, no hace falta una
  constante estática aparte ahora que el nombre no es estático) y, solo si
  `grupo` resolvió, `<GroupCategoryNav grupo={grupo}
  activeCategoriaSlug={slug} />` debajo. Si `grupo` es `undefined` (hoy,
  antes de Fase 2, siempre; o después, el caso borde de AC-6) se omite
  nivel 2 por completo — se degrada a como se ve hoy, sin romper nada.
- `src/app/grupo/[slug]/page.tsx` (**nuevo**, mismo esqueleto que
  `categoria/[slug]/page.tsx`): `dynamicParams = false`,
  `generateStaticParams` desde `getGroupList()`, `notFound()` si el slug no
  resuelve, `<CategoryNav activeGrupoSlug={slug} />` +
  `<GroupCategoryNav grupo={id} />` (sin `activeCategoriaSlug`) +
  `<CatalogView products={getProductsByGrupo(id)} />`.
- `src/app/ofertas/page.tsx`: sin cambios (fuera de alcance, confirmado
  arriba).

`CatalogView`/`ProductGrid`/`SearchBox`/`ProductCard` no cambian — siguen
recibiendo la lista de productos ya filtrada por la página, igual que hoy
hace `categoria/[slug]` con `getProductsByCategoria`.

## Sincronización con `renovarte-pipeline`

`public/data/serlaca_category_groups.json` llega a este repo con el mismo
mecanismo que ya trae `public/data/products.json`: `renovarte-pipeline`
corre `make publish`/`make publish-live`
(`pipeline/publish/run.py::run_publish` → `git_ops.prepare_branch`), que
arma una rama, copia archivo(s) al checkout de `renovarte-catalogo` y abre
un PR — revisado y mergeado a mano, nunca auto-merge (igual regla que
cualquier otro cambio a `products.json`, constitution §I.2).

**Estado real de ese mecanismo, verificado en el código de
`renovarte-pipeline` (2026-09-17):** `prepare_branch` ya recibe un
diccionario `files_to_update: dict[Path, Path]` (destino relativo dentro
de `renovarte-catalogo` → origen absoluto), y hoy `run_publish` le pasa
una sola entrada (`public/data/products.json`). Técnicamente sumar una
segunda entrada (`public/data/serlaca_category_groups.json` ←
`data/reference/serlaca_category_groups.json`) es una línea en ese
diccionario — el mecanismo de copiado en sí no necesita cambiar. **Pero
esto no está en el `plan.md` actual de `renovarte-pipeline`:** su §9
("Archivos tocados") lista explícitamente `pipeline/publish/*` bajo "No
tocados (a propósito)". Esa nota quedó desactualizada por la decisión del
CTO/CEO de este ciclo — es la coordinación pendiente que reporto al
final, no algo que este plan resuelva unilateralmente tocando el otro
repo.

## Riesgos / supuestos de diseño

1. **Coordinación pendiente con `renovarte-pipeline`.** El mecanismo de
   sincronización de arriba requiere que `renovarte-pipeline` extienda
   `run_publish`/`files_to_update` para copiar también
   `serlaca_category_groups.json` — un cambio chico pero real a un
   archivo que el `plan.md` de ese repo hoy marca como "no tocado". Sin
   ese cambio del otro lado, `public/data/serlaca_category_groups.json`
   nunca llega a este repo (el loader tolerante de `products.ts` sigue
   funcionando, pero todo grupo muestra su id crudo en vez de su nombre de
   negocio indefinidamente, no solo durante la Fase 1). Reportado al
   orquestador para que lo lleve al agente de `renovarte-pipeline`.
2. **Supuesto: una `categoria` específica pertenece a un único grupo.** El
   voto por mayoría en `deriveCategoriaGrupoMap` asume que esto es cierto
   (lo garantiza el AC-1 del spec espejo del pipeline, pero ese AC-1
   todavía no se verificó contra la API real). Si en la práctica una
   `categoria` queda repartida entre más de un `codCategoria`, este diseño
   **no falla el build** (a propósito — es un dato de otro repo, en
   revisión manual vía PR, no algo que deba bloquear un deploy de este
   lado) — solo elige el grupo mayoritario y ese producto "minoritario" de
   esa categoría sigue viéndose en `/`, en `/categoria/[slug]` y en su
   grupo mayoritario, pero no aparecería listado bajo su codCategoria
   individual "correcto" si difiere del de la mayoría. Se deja un
   comentario en el código citando esta nota y una tarea explícita en Fase
   2 para confirmar con datos reales que esto no ocurre (o, si ocurre, para
   reportarlo en vez de improvisar una regla nueva).
3. **`codCategoria` opcional, no obligatorio, en el tipo `Product`.**
   Decisión deliberada (ver `types.ts` arriba): mantiene el archivo real de
   hoy (sin `codCategoria` en ningún producto) válido durante toda la Fase
   1, y cumple AC-6 al pie de la letra sin necesitar una segunda
   enmienda cuando el pipeline lo publique.
4. **Distribución real de productos por grupo, desconocida hasta Fase 2.**
   La regla "ocultar el chip de grupo si count=0" (ver `## Datos`) es una
   propuesta razonable y de bajo riesgo (mismo criterio que "Ofertas" ya
   usa), pero si en la práctica un grupo con nombre de negocio (1/2/3)
   termina con muy pocos productos reales, la UX resultante (una pestaña
   casi vacía) es una decisión de producto que le corresponde al CTO/CEO
   revisar con datos reales, no algo que este plan resuelva por adelantado.

## Tests

- `tests/unit/category-groups.test.ts` (nuevo): solo `isCodCategoria`
  (hit/miss) y que `CATEGORY_GROUP_IDS` tenga exactamente 4 elementos en
  el orden `["1","2","3","4"]` — **no** afirma nada sobre nombres (ya no
  viven en este archivo).
- `tests/unit/types.test.ts` (extender): `validateGroupNames` — objeto con
  las 4 claves válidas pasa igual; una clave desconocida se descarta sin
  lanzar; un valor vacío para una clave se descarta sin lanzar (esa clave
  queda ausente del resultado); un `raw` que no es objeto (ej. un array)
  lanza.
- `tests/unit/products.test.ts` (extender): fixtures en memoria (arrays de
  `Product` literales y objetos de nombres literales, **no** tocan
  `public/data/products.json` ni requieren que exista
  `public/data/serlaca_category_groups.json` todavía) para:
  - `deriveCategoriaGrupoMap`: voto por mayoría correcto, empate
    determinista, productos sin `codCategoria`/con valor no reconocido no
    votan.
  - `deriveGroupList(products, groupNames)`: cuenta por grupo correcta,
    orden fijo 1→2→3→4, grupo con count 0 omitido, `nombre` toma el valor
    de `groupNames` cuando está y cae al id crudo cuando falta esa clave
    (fixture con un `groupNames` incompleto a propósito).
  - Wrappers (`getGroupList`, `grupoFromSlug`, `getGrupoSlug`,
    `getGrupoNombre`, `getProductsByGrupo`, `getCategoriaGrupo`,
    `getCategoryListForGroup`) contra el archivo real de **hoy**, con
    `public/data/serlaca_category_groups.json` todavía inexistente: no
    lanzan, devuelven `[]`/`undefined` con gracia (cero productos con
    `codCategoria` todavía) — sirve de regla de regresión para AC-6 y
    confirma que Fase 1 no rompe nada existente ni con el archivo de
    nombres ausente.
- `tests/unit/category-nav.test.tsx` (extender): con `activeGrupoSlug`
  fijado a un valor inventado (ninguno matchea con datos de hoy), la fila
  de nivel 1 no muestra ningún chip de grupo (porque `getGroupList()` da
  `[]` con datos de hoy) — regresión explícita de "sin pipeline, se
  degrada a la UI de antes".
- `tests/unit/group-category-nav.test.tsx` (nuevo, mismo patrón
  `renderToStaticMarkup`): con una lista de `CategoryEntry` inyectada... — no,
  el componente no toma la lista por prop (lee `getCategoryListForGroup`,
  igual patrón server-component que `CategoryNav`), así que este test
  corre contra datos de hoy y solo puede afirmar "no revienta, devuelve fila
  vacía" hasta Fase 2; se deja un comentario apuntando a la tarea de Fase 2
  que lo extiende con aserciones reales de contenido.
- `tests/e2e/catalog.spec.ts` (extender, Fase 1): `/grupo/no-existe` → 404;
  `/` sigue sin mostrar chips de categoría específica (nivel 2 ausente);
  `pnpm build` genera cero páginas `/grupo/*` con datos de hoy (documentado,
  no es un bug). Sin scroll horizontal a 390px en `/` con las nuevas filas
  (AC-5, aunque con 0 grupos visibles hoy — de bajo valor real hasta Fase
  2, pero corre igual y no debe fallar).
- **Fase 2 (bloqueada):** extender la e2e con datos reales — elegir un
  grupo real con productos, verificar AC-1 (nivel 1 visible, sin lista
  plana), AC-2 (grilla + nivel 2 acotados al grupo), AC-5 a 390px con la
  cantidad real de chips de nivel 2 del grupo más grande, y AC-6 con un
  producto real que (si lo hay) tenga `codCategoria` ausente o no
  reconocido.

## Verificación

```
pnpm build   # Fase 1: 0 páginas /grupo/* nuevas con datos de hoy (esperado); todo lo demás igual
pnpm gate
```

Manual (Fase 1): `pnpm dev`, confirmar que `/` ya no muestra la fila de 24
categorías (solo Todos/Ofertas), y que `/categoria/<slug>` sigue andando
igual que antes (sin nivel 2 visible, porque `codCategoria` no existe
todavía).

Manual (Fase 2, cuando el pipeline publique el campo): abrir un `/grupo/<slug>`
real en el teléfono, confirmar conteos, volver con "Todos", y repetir el
recorrido de spec 0003 (`/categoria/<slug>` → 404 en inexistente) sin
regresión.
