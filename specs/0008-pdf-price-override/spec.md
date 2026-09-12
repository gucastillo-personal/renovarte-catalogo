# 0008 — Precio desde PDF de LACA (ABC / lista), con decisión manual por producto

**Status:** Backlog
**PRD:** RF-10 (nuevo); relacionado con RF-06, RF-07, RF-09
**RFC:** RFC-0001 §2.3 (cálculo de precio), §2.4 (schema público — sin cambios)

_Reemplaza al 0008 anterior ("LACA public reference data"), deprecado el
2026-09-10. Reutiliza el número: es la misma fuente de datos (el PDF público
de LACA) pero con un objetivo distinto — no un reporte de márgenes, sino una
fuente de precio alternativa que el admin puede elegir aplicar producto por
producto._

## Why

Hoy `precio_venta` sale siempre de `costo × (1 + margen)` (spec 0002/0009). El
PDF público de LACA trae, por producto, **tres** precios (columnas reales del
catálogo LACA):

| Columna PDF | Qué es |
|---|---|
| **Precio Profesional** | Lo que paga el revendedor (RenovArte) — es costo, no un precio de venta. Equivalente en naturaleza a `precio_costo`/`price` de la API serlaca (spec 0009). |
| **Precio ABC** | Precio sugerido de venta de LACA. |
| **Precio Catálogo** | Precio ofrecido al público final (el que ve el consumidor final en el catálogo de LACA). |

El admin quiere poder usar directamente el ABC o el Catálogo como
`precio_venta` para productos puntuales, en vez de (o además de) el cálculo
costo+margen — por ejemplo, para alinear el precio de venta al valor ABC del
PDF cuando eso convenga comercialmente. **Precio Profesional nunca es una
opción de precio de venta** — es costo, y tratarlo como los otros dos violaría
`constitution.md` §I.1 (nunca commitear costo).

## User value

- El admin baja el PDF de LACA, lo convierte a datos estructurados, y ve —
  antes de publicar nada — una comparación por producto entre el precio
  actual (costo + margen), Precio ABC y Precio Catálogo, con el margen
  implícito de cada opción calculado contra Precio Profesional.
- El admin decide, producto por producto, si el `precio_venta` publicado pasa
  a ser el ABC, el Catálogo, o se mantiene el cálculo actual. Por defecto se
  propone ABC, pero la decisión final es siempre manual y explícita — nunca
  se sobreescribe el catálogo completo de forma automática.
- La decisión persiste: correr `pnpm transform` de nuevo (por ejemplo tras un
  `pnpm ingest` nuevo) no pierde las decisiones ya tomadas.

## Scope

### In

1. **Extracción PDF → datos estructurados, separando lo sensible de lo
   público.** Un comando lee el PDF de precios de LACA y extrae, por fila:
   `codigo` (código de producto LACA, igual al usado como `id` en
   `products.json`), `nombre_pdf`, `precio_profesional`, `precio_abc`,
   `precio_catalogo`. La extracción cruda (las tres columnas) se escribe a un
   archivo **gitignorado**, mismo tratamiento que `data/raw/`/`data/input/`
   (contiene `precio_profesional`, que es costo). De ahí se deriva
   `data/reference/laca_pdf_precios.csv` (o `.json`, a definir en `plan.md`)
   con solo `codigo`, `nombre_pdf`, `precio_abc`, `precio_catalogo`, `fuente`
   (nombre/fecha del PDF de origen) — **sin** `precio_profesional`. Ese
   derivado sí es información pública (precios sugeridos/de catálogo de LACA)
   y **se commitea**, igual que ya prevé `constitution.md` §I.3 para
   `data/reference/`.
2. **Match contra el catálogo ya transformado.** El match cruza el crudo
   extraído del PDF contra `public/data/products.json` (la salida de
   `pnpm transform`) por `codigo`. Casos sin match en ningún sentido se
   reportan, nunca se descartan en silencio:
   - Producto del catálogo sin fila en el PDF → sigue con su `precio_venta`
     calculado (costo + margen) sin cambios, listado aparte como "sin dato de
     PDF".
   - Fila del PDF sin producto correspondiente en el catálogo → se lista
     aparte como "sin match en catálogo" (puede ser un producto profesional-
     exclusivo ya filtrado, o un código discontinuado).
3. **Vista de revisión (página local, no productiva).** Una página local —
   corrida solo por el admin en su máquina, nunca desplegada ni parte del
   build público de Next.js, con acceso al crudo gitignorado (mismo nivel de
   confianza que el resto de los scripts de ingesta) — muestra, por producto
   matcheado: nombre, `precio_venta` actual, Precio ABC, Precio Catálogo, y el
   margen implícito de cada uno contra Precio Profesional. Un selector permite
   elegir qué tomar como `precio_venta` (**ABC preseleccionado por defecto**;
   opciones: ABC, Catálogo, o mantener el precio actual). **Precio
   Profesional se muestra solo como contexto — no es una opción
   seleccionable** de precio de venta.
4. **Persistencia de la decisión.** Confirmar la revisión escribe/actualiza
   `data/reference/precio_pdf_decisiones.json` (committed), keyed por
   `codigo`, con la fuente elegida (`abc` | `catalogo` | `actual`) y el valor
   resultante. Este archivo **no** contiene `precio_profesional`,
   `precio_costo` ni margen — solo el precio final elegido, igual nivel de
   exposición que `products.json`.
5. **Aplicación en `pnpm transform`.** `pnpm transform` carga
   `data/reference/precio_pdf_decisiones.json` (si existe) y lo aplica como
   overlay final sobre `precio_venta` para los códigos con decisión ≠
   `"actual"`, después de calcular costo+margen y antes de aplicar el
   descuento de oferta de `data/offers.json` (spec 0005/0007) — es decir, si
   un producto está además en oferta, el % de descuento se calcula sobre el
   precio elegido del PDF (ABC o Catálogo), no sobre el precio costo+margen.
   El resto del catálogo (sin decisión guardada) sigue el cálculo
   costo+margen sin cambios.

### Out

- Automatizar la detección de que LACA publicó un PDF nuevo, o la re-
  extracción periódica — el admin baja el PDF y corre el comando a mano
  (igual que hoy con el CSV de costos).
- Cambiar el schema público de `Product` — no se agrega ninguna key nueva a
  `products.json`; `precio_venta` sigue siendo la única fuente de precio
  visible, sea cual sea su origen.
- Aplicar una decisión en bloque a una categoría o a todo el catálogo — la
  decisión es siempre por producto individual.
- Validar automáticamente que el precio elegido quede "por debajo del precio
  público de LACA" (PRD §2.1) — queda a criterio del admin; ver riesgo en el
  PRD (§8).
- Desplegar la página de revisión a Vercel o incluirla en rutas públicas de
  la app.

## Acceptance criteria

1. **AC-1 (extracción · RF-10):** el comando de extracción, corrido sobre un
   PDF de precios de LACA, produce el crudo (`codigo`, `nombre_pdf`,
   `precio_profesional`, `precio_abc`, `precio_catalogo`) en un archivo
   gitignorado, y deriva `data/reference/laca_pdf_precios.csv` con
   `codigo`, `nombre_pdf`, `precio_abc`, `precio_catalogo`, `fuente` — sin
   `precio_profesional`. *Verificado por:* test sobre un PDF de fixture;
   `git check-ignore` sobre el crudo (debe confirmar que está ignorado) y
   sobre `laca_pdf_precios.csv` (debe fallar, es decir, no está ignorado).
2. **AC-2 (match · RF-10):** dado el crudo del PDF y
   `public/data/products.json` de fixture, el match agrupa correctamente en
   "matcheados", "catálogo sin dato de PDF" y "PDF sin match en catálogo", sin
   perder ninguna fila de ninguno de los dos archivos de entrada. *Verificado
   por:* Vitest con casos de match/no-match en ambos sentidos.
3. **AC-3 (preview · RF-10):** la página de revisión, para cada producto
   matcheado, muestra `precio_venta` actual, Precio ABC, Precio Catálogo y el
   margen implícito de cada uno contra Precio Profesional, con ABC
   preseleccionado entre las opciones elegibles (ABC / Catálogo / actual);
   cambiar la selección y confirmar persiste la elección. *Verificado por:*
   recorrido manual documentado (no hay Playwright sobre esta página — no es
   parte de la app pública).
4. **AC-4 (persistencia · RF-10):** confirmar la revisión escribe
   `data/reference/precio_pdf_decisiones.json` con, por `codigo` decidido, la
   fuente (`abc`/`catalogo`/`actual`) y el valor; el archivo no contiene
   `precio_profesional`, `precio_costo` ni ningún campo de margen. *Verificado
   por:* Vitest + inspección de un archivo generado de ejemplo.
5. **AC-5 (aplicación · RF-06/RF-07/RF-10):** con una decisión guardada para
   un código, `pnpm transform` publica ese `precio_venta` tal cual la
   decisión (no el costo+margen calculado); si ese mismo código está en
   `data/offers.json`, el descuento se aplica sobre el precio elegido del
   PDF, no sobre el precio costo+margen. Códigos sin decisión guardada no
   cambian de comportamiento. *Verificado por:* Vitest sobre `buildCatalog`
   con fixtures combinando decisión + oferta.
6. **AC-6 (determinismo · RF-07):** correr `pnpm transform` dos veces con el
   mismo `data/input/` + las mismas decisiones deja `git diff` vacío (igual
   criterio que AC-6 de la spec 0009). *Verificado por:* test + manual.
7. **AC-7 (seguridad · RNF-03 / constitution §I.1):** `precio_profesional` no
   aparece en ningún archivo committeado (ni en `laca_pdf_precios.csv` ni en
   `precio_pdf_decisiones.json` ni en `products.json`), y no es seleccionable
   como precio de venta en la página de revisión; `pnpm check:leak` sigue
   verde; la página de revisión no corre en producción/Vercel ni se sirve
   fuera de la máquina del admin. *Verificado por:* `check:leak` + `git
   check-ignore` + revisión de las rutas/scripts desplegados.

## Notas

- Nombres reales de las columnas del PDF (confirmado con el catálogo LACA,
  lista Septiembre 2026, `data/raw/Septiembre.pdf` — gitignored): **Precio
  Profesional** (costo del revendedor), **Precio ABC*** (precio sugerido de
  venta), **Precio Catálogo** (precio ofrecido al público final). El `*`
  remite a la leyenda de "REFERENCIAS" (página 2 del PDF): `*ASESOR/A DE
  BELLEZA CALIFICADO/A = A1` — el ABC es el precio para ese nivel de
  asesora; no cambia cómo lo tratamos (sigue siendo un número a extraer),
  solo documenta qué significa.
- El margen implícito que la página de revisión muestra para ayudar a decidir
  se calcula localmente contra Precio Profesional, pero **no** se guarda en
  `precio_pdf_decisiones.json` — ese archivo solo registra la fuente y el
  valor final elegido, con el mismo nivel de exposición que `products.json`
  (constitution §I.1).
- Reabre y reemplaza el rol que iba a tener el 0008 original (comparación de
  precio propio vs. precio público de LACA para el reporte 0007) — si más
  adelante hace falta ese reporte, puede construirse sobre
  `laca_pdf_precios.csv` (o sobre Precio Profesional del crudo gitignorado,
  como cost benchmark) sin volver a tocar el PDF.
- Los montos del PDF vienen en formato argentino (`$ 21.300`, separador de
  miles con punto) — reusar `parseARSNumber` (`scripts/lib/sources/csv.ts`,
  spec 0002) en vez de escribir un parser de números nuevo (donde el parser,
  igual sea Python o TS, entregue montos ya normalizados a número).
- **Extracción: Python + `pdfplumber`**, decidido y documentado en
  [RFC-0001 §4](../../docs/rfc/0001-arquitectura-catalogo.md#4-alternativas-consideradas)
  y [constitution.md §III.11](../constitution.md) — único script no-TypeScript
  del repo, acotado a `scripts/pdf/extract.py`, nunca corre en runtime/Vercel.
  Motivo: el PDF real **no** tiene un orden de texto confiable por stream (en
  varias páginas el extractor lineal trae primero todos los precios de la
  página en un bloque, luego todos los "Ptos", y al final todos los pares
  código+nombre — desalineado de la fila visual); se prefirió una librería
  con heurísticas de tabla por posición ya probadas en vez de reconstruir eso
  a mano.
- **Estructura real de tablas confirmada sobre el PDF** (para `plan.md`):
  - La mayoría de las secciones tiene 3 columnas de precio (Profesional / ABC
    / Catálogo) + Ptos. Algunas secciones (KIT KILO, Unidosis, Paletas /
    Pincelería / Artístico) solo tienen **2** columnas (Profesional / ABC,
    sin Catálogo) — el parser tiene que soportar ambos anchos de tabla, no
    asumir siempre 3 precios por fila.
  - Precio faltante se muestra como `-` en el PDF (ej. Catálogo vacío) — se
    extrae como ausente, no como `0`.
  - Badge `CP` ("Consulte Precio") aparece pegado a algunos valores — el
    precio numérico sigue presente al lado, se extrae igual; `CP` no bloquea
    la fila.
  - Íconos entre nombre y `ml/g` (`A` aparatología, `L` lanzamiento, `♡`
    favoritos, `!` producto en oferta) son ruido para esta spec — el parser
    los descarta, no son parte de `codigo`/`nombre_pdf`/precios.
  - Páginas sin datos de producto (portada, puntos de venta física, tabla de
    puntos "Befila", contratapa) deben quedar excluidas — filtrar por
    presencia de un `codigo` con el patrón esperado, no por rango de página
    fijo (el PDF puede cambiar de paginación mes a mes).
  - **Caso real de código duplicado dentro del propio PDF**: `702000504`
    aparece dos veces con precios distintos — una vez en la tabla de
    "Unidosis" ("Pack x5 unidosis iguales a elección") y otra en la tabla de
    bulto x4 unidades ("Neblina Hidratante con malva y boswelia 250 ml x 4
    unidades"). Es un error/reuso real del PDF de origen, no un bug del
    parser — tratarlo como AC-2 exige para "sin match": reportarlo aparte
    (warning), nunca resolverlo en silencio quedándose con uno de los dos.
- Definir en `plan.md`: formato exacto (CSV vs JSON) del crudo intermedio
  entre `extract.py` y el resto del pipeline TypeScript, y si la página de
  revisión es una ruta de Next en modo dev, un script standalone con servidor
  mínimo, o un archivo HTML estático generado que lee/escribe el JSON de
  decisiones localmente.
