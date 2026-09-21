# RFC-0001 — Arquitectura del catálogo web RenovArte

| | |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-09-10 |
| **PRD relacionado** | [PRD — Catálogo RenovArte](../PRD/PRD-catalogo-renovarte.md) |
| **Reemplaza** | — |
| **Enmiendas** | 2026-09-10 — §2.2: la API de serlaca (`Products/ReadProducts`) es fuente de ingesta soportada, no solo el export CSV manual (ver [spec 0009](../../specs/0009-api-ingest/spec.md)). 2026-09-11 — §2.4: campos opcionales `precio_regular` / `descuento_pct` para precio de oferta (ver [spec 0007](../../specs/0007-offer-pricing/spec.md)). 2026-09-12 — §1/§2.2/§2.3/§2.4/§2.5: el PDF de precios LACA pasa de referencia pasiva a fuente opcional de `precio_venta` por producto, vía decisión manual del admin (ver [spec 0008](../../specs/0008-pdf-price-override/spec.md)). **2026-09-14 — migración completa**: todo el pipeline de ingesta descripto en §2.2-§2.5 y §4 (`scripts/ingest.ts`, `scripts/transform.ts`, `scripts/lib/**`, la extracción Python del PDF) se extrajo a un repo separado, [`renovarte-pipeline`](https://github.com/gucastillo-personal/renovarte-pipeline) — ver nota debajo. **2026-09-17 — §2.4:** campo público opcional `codCategoria` (agrupación de alto nivel de categorías) y nueva ruta `/grupo/[slug]` (ver [spec 0015](../../specs/0015-agrupacion-categorias/spec.md), producido por el spec espejo `0001` de `renovarte-pipeline`). |

> **Vigente desde 2026-09-14:** todo lo que este RFC describe sobre
> ingesta, costo, margen, el PDF de LACA y su extracción (§2.2, §2.3 en la
> parte de cálculo de precio, §2.5 en la parte de `scripts/`, y §4 sobre
> Python/`pdfplumber`) **ya no vive en este repo**. Se migró a
> [`renovarte-pipeline`](https://github.com/gucastillo-personal/renovarte-pipeline)
> (repo Python separado) — ver `PLAN.md` y `docs/flujo-precio-pdf.md` en
> [`renovarte-parent`](https://github.com/gucastillo-personal/renovarte-parent)
> para la arquitectura vigente. Las secciones de abajo quedan como
> **contexto histórico** de por qué el catálogo tiene la forma que tiene
> (schema público, invariantes de seguridad §2.3/§2.4) — no describen dónde
> corre el código hoy. `renovarte-catalogo` es 100% TypeScript otra vez; la
> excepción Python nunca llegó a construirse acá (se construyó directo en
> el repo nuevo).

## 1. Contexto

Según el PRD, necesitamos un catálogo web público (sin carrito) para revender productos de LACA con precio propio (costo + margen), manteniendo el costo y el margen fuera de la vista pública, con actualización manual de datos y costo de infraestructura $0.

Tenemos dos fuentes de datos:
1. **Costo real**: export CSV desde la API interna de serlaca (`api.serlaca.com/Products/ReadProducts`), autenticado con API key propia.
2. **Precio público de LACA**: catálogo PDF oficial (precio de lista/oferta al consumidor), usado como referencia de mercado, no como precio propio.

> **Enmienda 2026-09-12 (spec 0008).** El PDF de LACA deja de ser solo
> referencia: trae **tres** columnas por producto (Precio Profesional =
> costo del revendedor, Precio ABC y Precio Catálogo = precios sugeridos de
> venta). El admin puede elegir, producto por producto, usar ABC o Catálogo
> como `precio_venta` publicado en vez del cálculo costo+margen. Precio
> Profesional sigue siendo estrictamente costo (mismo tratamiento que
> `precio_costo` — nunca se commitea, nunca es una opción de precio de
> venta). El PDF pasa así de fuente de referencia de solo lectura a una
> **tercera fuente de dato de precio**, junto a costo (CSV/API serlaca) y
> ofertas manuales (`data/offers.json`, spec 0005).

## 2. Decisión

### 2.1 Stack
- **Next.js** (App Router) como framework React — permite SEO real vía SSG/SSR, a diferencia de una SPA pura.
- **Tailwind CSS** para estilos, con paleta extraída del logo (verde salvia / beige).
- **Sin base de datos**: los datos viven en un archivo `products.json` estático, generado por un script de ingesta.
- **Vercel** como hosting (free tier, deploy automático por `git push`, apto para Next.js sin configuración adicional).

> **Enmienda 2026-09-12 (spec 0008).** Se suma **Python** (`pdfplumber`), acotado
> a un único script local (`scripts/pdf/extract.py`) que lee el PDF de LACA y
> produce datos estructurados en disco. Es la primera pieza no-TypeScript del
> repo — motivo y alternativas evaluadas en §4. No corre en runtime ni en
> Vercel; todo lo demás (match, revisión, persistencia de decisiones, overlay
> en `pnpm transform`) sigue en TypeScript, como el resto del pipeline.

### 2.2 Flujo de datos

```
CSV serlaca (costo) ──┐
                       ├──> scripts/ingest.ts ──> public/data/products.json   (público)
JSON precios LACA ─────┘         │
   (referencia,                  └──> data/private/margin-report.csv          (privado, gitignored)
    del PDF)
```

El script de ingesta corre **localmente**, nunca en el servidor de producción. Genera dos salidas con propósitos y niveles de acceso distintos:

- `public/data/products.json`: consumido por la web. Contiene únicamente campos seguros para exponer (nombre, categoría, descripción, imagen, `precio_venta` ya calculado).
- `data/private/margin-report.csv`: uso interno exclusivo del dueño del negocio. Contiene costo, margen aplicado y comparación contra el precio público de LACA. **No se commitea al repositorio** (incluido en `.gitignore`).

> **Enmienda 2026-09-10 (spec 0009).** La fuente de costo de `scripts/ingest.ts`
> puede ser **(a)** un export CSV local (`data/raw/serlaca_export.csv`,
> implementado en [spec 0002](../../specs/0002-ingest-script/spec.md)) **o
> (b)** la API de serlaca `Products/ReadProducts` directamente, autenticada con
> `SERLACA_API_KEY` (en `.env.local`, sin prefijo `NEXT_PUBLIC_`, nunca en
> Vercel). Ambas rutas producen las mismas filas de costo y comparten la misma
> pipeline de transformación/validación y las mismas salidas. La API es la ruta
> por defecto; el CSV queda como fallback offline. El script sigue corriendo
> **localmente** (o en un GitHub Action programado — fuera de este RFC); **no**
> se introduce fetch en runtime ni en Vercel (mantiene "sin backend en runtime",
> §3).

Diagrama actualizado:

```
API serlaca (costo)  ──┐   [SERLACA_API_KEY]
  ó CSV local (costo) ──┤
                        ├──> scripts/ingest.ts ──> public/data/products.json   (público)
JSON precios LACA  ─────┘         │
   (referencia, del PDF)          └──> data/private/margin-report.csv          (privado, gitignored)
```

> **Enmienda 2026-09-12 (spec 0008).** Una segunda pipeline, independiente y
> corrida a mano, extrae y aplica los precios del PDF de LACA como *overlay*
> opcional sobre el `precio_venta` que ya sale de la pipeline de costo+margen
> de arriba — no la reemplaza:
>
> ```
> PDF LACA (precios) ──> scripts/pdf/extract.py     ──┬──> data/raw/…                        (gitignored: tiene Precio Profesional = costo)
>                         (Python, pdfplumber)         └──> data/reference/laca_pdf_precios.csv   (público: codigo, nombre_pdf, precio_abc,
>                                                                                                    precio_catalogo, fuente)
>                                                                   │
>                                                                   ▼
>                     public/data/products.json ──────────> página de revisión (local, no desplegada, TypeScript)
>                     (ya generado arriba)                    match por codigo, admin decide por producto
>                                                                   │
>                                                                   ▼
>                                                   data/reference/precio_pdf_decisiones.json   (público, committed)
>                                                                   │
>                                                                   ▼
>                                              scripts/transform.ts ──> public/data/products.json  (re-generado, overlay aplicado)
> ```
>
> La extracción (único paso en Python) separa lo sensible (Precio Profesional
> → gitignored, mismo nivel que `data/raw/`) de lo público (ABC, Catálogo →
> `data/reference/`, committed — dato de mercado, no de costo propio, igual
> criterio que `laca_precios_publicos.json` más abajo) y termina ahí: no
> importa nada de Python al resto de la app. Todo lo que sigue —match, la
> página de revisión, la persistencia de la decisión y el overlay en
> `pnpm transform`— es TypeScript, igual que el resto del pipeline. La página
> de revisión corre solo en la máquina del admin, nunca en Vercel; su única
> salida committeada es `precio_pdf_decisiones.json`. `scripts/transform.ts`
> vuelve a correr después para aplicar esas decisiones (§2.3).

### 2.3 Cálculo de precio

```
precio_venta = round(costo × (1 + margen% / 100))
```

El margen se define por variable de entorno **sin prefijo `NEXT_PUBLIC_`**:

```bash
MARGIN_PERCENT_DEFAULT=20
MARGIN_PERCENT_ANTIAGE=30        # opcional, override por categoría
```

Motivo de no usar `NEXT_PUBLIC_`: cualquier variable con ese prefijo en Next.js se incluye en el bundle de JavaScript que se descarga en el navegador del cliente. Como estas variables solo las necesita el script de ingesta (que corre en Node, en la máquina del desarrollador, nunca en el cliente), no hay razón para exponerlas, y hacerlo sería un riesgo de seguridad de negocio (permitiría inferir costo y margen).

> **Enmienda 2026-09-12 (spec 0008).** Si existe una decisión guardada para
> el `codigo` de un producto (`data/reference/precio_pdf_decisiones.json`,
> `fuente` = `abc` | `catalogo`), esa decisión reemplaza el resultado de
> `precio_venta = round(costo × (1 + margen%/100))` como el precio "regular"
> del producto — **antes** de aplicar el descuento de oferta (spec 0007
> §2.4): si el producto está además en `data/offers.json`, el `%` se calcula
> sobre el precio elegido del PDF, no sobre costo+margen. Códigos sin
> decisión guardada, o con `fuente` = `actual`, siguen el cálculo
> costo+margen sin cambios:
>
> ```
> base = decision(codigo)?.valor ?? round(costo × (1 + margen%/100))
> precio_venta = en_oferta ? round(base × (1 − descuento_pct/100)) : base
> ```
>
> El margen ya no es la única fuente de `precio_venta`, pero sigue siendo el
> **default** — la decisión del PDF es siempre una anulación explícita, por
> producto, nunca automática (constitution §I.1: costo/margen igual nunca se
> exponen, la decisión solo persiste el valor final elegido).

### 2.4 Modelo de datos

**Producto público** (`products.json`):
```json
{
  "id": "545300004",
  "proveedor": "LACA",
  "categoria": "Antiage",
  "nombre": "Complejo Antiage con Omega Plus",
  "presentacion": "50g",
  "descripcion": "Textura sedosa, otorga una segunda piel luminosa.",
  "precio_venta": 35280,
  "imagen": "/img/laca/545300004.jpg",
  "en_oferta": false,
  "tags": ["día", "antiage"]
}
```

**Reporte interno** (`margin-report.csv`, no público):
```csv
codigo,nombre,costo,margen_%,precio_venta,precio_publico_laca,diferencia_$,diferencia_%
545300004,Complejo Antiage Omega Plus,28000,26,35280,39200,3920,10.0%
```

El campo `proveedor` está presente desde el día uno del modelo, aunque hoy solo haya un proveedor cargado (LACA), para no requerir un cambio de esquema cuando se sume el segundo proveedor (ver PRD, fase 4).

> **Enmienda 2026-09-11 (spec 0007 — precio de oferta).** Dos campos
> **opcionales**, presentes solo cuando el producto está en oferta con
> descuento (`data/offers.json`, `descuento_pct > 0` — spec 0005):
>
> ```json
> {
>   "...": "...",
>   "precio_venta": 24408,
>   "precio_regular": 27120,
>   "descuento_pct": 10,
>   "en_oferta": true
> }
> ```
>
> `precio_venta` sigue siendo el precio final (el que se cobra); `precio_regular`
> es el precio sin la promo, para mostrar "antes / ahora" en la UI. Ninguno de
> los dos es costo ni margen — siguen sin aparecer en ningún artefacto público
> (constitution §I). Las specs ex-0007 (reporte de márgenes) y ex-0008
> (referencia de precios públicos de LACA) se eliminaron; el `margin-report.csv`
> descripto abajo queda como diseño original, sin spec activa.

> **Enmienda 2026-09-12 (spec 0008).** El schema público de `Product` **no
> cambia** — `precio_venta` (y `precio_regular`/`descuento_pct` cuando aplica)
> sigue siendo la única info de precio visible, sea cual sea su origen. Se
> suman dos archivos nuevos en `data/reference/` (públicos, committed, mismo
> tratamiento que `laca_precios_publicos.json`):
>
> ```json
> // data/reference/laca_pdf_precios.csv (una fila por producto del PDF)
> codigo,nombre_pdf,precio_abc,precio_catalogo,fuente
> 545300004,Complejo Antiage Omega Plus,35280,39200,"LACA Aniversario 2026/2027 (extraído 2026-09-12)"
> ```
>
> ```json
> // data/reference/precio_pdf_decisiones.json (keyed por codigo)
> {
>   "545300004": { "fuente": "abc", "valor": 35280 }
> }
> ```
>
> Ninguno de los dos contiene Precio Profesional, `precio_costo` ni margen —
> ese dato vive únicamente en el crudo gitignorado de la extracción (mismo
> nivel de exposición que `data/raw/serlaca_export.csv`).

> **Enmienda 2026-09-17 (spec 0015 — agrupación de categorías en dos
> niveles).** El schema público de `Product` suma un campo **opcional**:
>
> ```json
> {
>   "...": "...",
>   "codCategoria": ["1", "2"]
> }
> ```
>
> `codCategoria` es la **lista** de ids crudos de agrupación de alto nivel
> de Serlaca a los que pertenece el producto (cada elemento en
> `"1"`/`"2"`/`"3"`/`"4"`), producida por `renovarte-pipeline` (spec espejo
> `0001-agrupacion-alto-nivel-categorias`). Es un array y no un id único
> porque **un producto puede pertenecer a más de un grupo a la vez**:
> verificado contra la API real de Serlaca (spec 0001, AC-1), 11 de las 24
> categorías específicas de hoy aparecen repartidas entre más de un grupo,
> lo que invalidó el supuesto original 1 producto = 1 grupo (ver enmienda
> equivalente 2026-09-18 en el RFC de `renovarte-pipeline`, y `ux.md` de
> spec 0015, sección "Multi-grupo"). Es **opcional en el tipo `Product` de
> este repo** (no obligatorio), a pesar de que ese spec garantiza (su AC-2)
> que todo producto que publique va a traer un array no vacío: el lado
> receptor lo trata de forma defensiva — ausente, vacío, o con ids no
> reconocidos (fuera de `"1"`-`"4"`) no rompe el build ni hace desaparecer
> el producto de la vista general (`/`), solo hace que ese producto no
> pertenezca a ningún grupo de alto nivel específico (spec 0015, AC-6). Un
> producto que pertenece a 2+ grupos aparece en la grilla de cada uno de
> ellos sin ninguna marca distintiva (misma card en todos los grupos); su
> ficha individual (`/producto/[id]`) sí lista un chip por cada grupo al
> que pertenece. Este es el mismo criterio ya aplicado a `categoria` y al
> resto del schema: el catálogo es el "extremo receptor" (nota de
> 2026-09-14 arriba) y no confía ciegamente en la forma exacta de un
> artefacto generado por otro repo.
>
> El nombre visible de cada grupo (`"Cuidado facial"`, `"Cuidado
> corporal"`, `"Cosmética"`, `"Otros"` — los 4 ya confirmados por el
> CTO/CEO) **no viaja en `products.json`** — `codCategoria` es el id crudo.
> **Decisión del CTO/CEO (2026-09-17, revisión posterior a la primera
> versión de esta enmienda): `renovarte-pipeline` es la única fuente de
> verdad del mapeo id → nombre** — vive en
> `data/reference/serlaca_category_groups.json` de ese repo (spec espejo
> `0001`, `plan.md` §2). `renovarte-catalogo` **no lo redefine ni lo
> duplica a mano**: recibe una copia de ese mismo archivo en
> `public/data/serlaca_category_groups.json`, publicada por
> `renovarte-pipeline` con el **mismo mecanismo** que ya usa para
> `products.json` (`pipeline/publish/run.py`, PR automático revisado y
> mergeado a mano — nunca auto-merge) — el diccionario de archivos que ese
> paso copia (`files_to_update` en `prepare_branch`) ya soporta más de una
> entrada, así que sumar esta segunda ruta no es un mecanismo nuevo, es
> extender el existente. **Esto requiere un cambio del lado de
> `renovarte-pipeline`** (su `plan.md` actual, §9, lista
> `pipeline/publish/*` explícitamente como "no tocado" — desactualizado
> por esta decisión; coordinación entre specs, no resuelta unilateralmente
> acá). `src/lib/category-groups.ts` en este repo queda reducido a la
> lista fija de ids conocidos (`CATEGORY_GROUP_IDS`, el *orden* de
> presentación 1→2→3→4) y un guard `isCodCategoria` — nunca los nombres.
> El *loader* de `public/data/serlaca_category_groups.json` (en
> `src/lib/products.ts`, mismo patrón que el de `products.json`) es
> tolerante a que el archivo todavía no exista (no hay PR previo del
> pipeline que lo haya publicado) o a que falte alguna clave: en ambos
> casos no rompe el build, y un grupo sin nombre resuelto muestra su id
> crudo como fallback en vez de tirar el catálogo entero — mismo criterio
> "extremo receptor, no confía ciegamente" ya aplicado arriba a
> `codCategoria` por producto.
>
> Arquitectura: se suma una ruta estática nueva, `src/app/grupo/[slug]/
> page.tsx` (mismo patrón SSG que `categoria/[slug]`), para la vista de "solo
> ese grupo". No se introduce una ruta anidada `/grupo/[g]/categoria/[c]`:
> como los slugs de `categoria` ya son únicos en todo el catálogo (spec
> 0003), `/categoria/[slug]` sigue siendo la URL canónica y compartible
> para una categoría específica, y su grupo se deriva en el servidor al
> renderizar (no vive en la URL). Detalle completo en `specs/0015-…/plan.md`.

### 2.5 Estructura de carpetas

```
renovarte-catalogo/
├── .env.local                          # MARGIN_PERCENT_* (gitignored)
├── .gitignore                          # .env.local, data/raw, data/private
├── data/
│   ├── raw/serlaca_export.csv          # gitignored
│   ├── raw/laca_pdf_precios.raw.*      # gitignored (spec 0008 — tiene Precio Profesional)
│   ├── reference/laca_precios_publicos.json   # SÍ se commitea (dato público de mercado)
│   ├── reference/laca_pdf_precios.csv         # SÍ se commitea (spec 0008 — ABC/Catálogo, sin Precio Profesional)
│   ├── reference/precio_pdf_decisiones.json   # SÍ se commitea (spec 0008 — decisión del admin por producto)
│   └── private/margin-report.csv       # gitignored
├── scripts/
│   ├── ingest.ts
│   ├── pdf/
│   │   ├── extract.py                  # spec 0008 — único script Python del repo (pdfplumber)
│   │   ├── requirements.txt            # (o pyproject.toml, a definir en plan.md)
│   │   └── .venv/                      # gitignored — entorno virtual local
│   └── …                               # match/revisión/persistencia del PDF (TypeScript), detalle en plan.md de spec 0008
├── public/
│   ├── data/products.json              # generado, consumido por la app
│   └── img/laca/*.jpg
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── categoria/[slug]/page.tsx
│   │   └── producto/[id]/page.tsx
│   ├── components/{ProductCard,FilterBar,CategoryNav}.tsx
│   └── lib/{products.ts,types.ts}
└── README.md
```

### 2.6 Script de ingesta (referencia de implementación)

```ts
// scripts/ingest.ts
import fs from "fs";
import { parse } from "csv-parse/sync";
import "dotenv/config";

const MARGIN_DEFAULT = Number(process.env.MARGIN_PERCENT_DEFAULT ?? 20);

const costos = parse(fs.readFileSync("data/raw/serlaca_export.csv", "utf-8"), { columns: true });
const referenciaLaca = JSON.parse(fs.readFileSync("data/reference/laca_precios_publicos.json", "utf-8"));

function getMargin(categoria: string): number {
  const key = `MARGIN_PERCENT_${categoria.toUpperCase().replace(/\s/g, "_")}`;
  return Number(process.env[key] ?? MARGIN_DEFAULT);
}

const productosPublicos: any[] = [];
const reporteInterno: any[] = [];

for (const item of costos) {
  const margen = getMargin(item.categoria ?? "default");
  const costo = Number(item.precio_costo);
  const precioVenta = Math.round(costo * (1 + margen / 100));
  const ref = referenciaLaca[item.codigo];

  productosPublicos.push({
    id: item.codigo,
    proveedor: "LACA",
    categoria: item.categoria,
    nombre: item.nombre,
    presentacion: item.presentacion,
    precio_venta: precioVenta,
    imagen: `/img/laca/${item.codigo}.jpg`,
  });

  if (ref) {
    const diffAbs = ref.precio_publico_laca - precioVenta;
    reporteInterno.push({
      codigo: item.codigo,
      nombre: item.nombre,
      costo,
      margen_pct: margen,
      precio_venta: precioVenta,
      precio_publico_laca: ref.precio_publico_laca,
      diferencia_$: diffAbs,
      diferencia_%: ((diffAbs / ref.precio_publico_laca) * 100).toFixed(1),
    });
  }
}

fs.writeFileSync("public/data/products.json", JSON.stringify(productosPublicos, null, 2));
// escribir reporteInterno como CSV en data/private/margin-report.csv
```

## 3. Consecuencias

**Positivas:**
- Costo de infraestructura $0 (sin DB, sin backend en runtime, hosting free tier).
- Superficie de ataque mínima para filtración de costo/margen: al no existir esos datos en ningún artefacto público, no hay forma de que se filtren por un error de UI.
- Arquitectura lista para multi-proveedor sin refactor de esquema.
- El reporte de márgenes (`margin-report.csv`) le da al negocio una herramienta objetiva para fijar precios, no solo al catálogo web.

**Negativas / trade-offs aceptados:**
- La actualización de catálogo es manual (correr script + `git push`), no hay panel de administración. Aceptado como parte del alcance de Fase 1 (ver PRD, sección 4.2).
- Sin base de datos, cualquier feature futura que necesite estado dinámico (carrito, stock en tiempo real) va a requerir agregar backend — evaluado y aceptado como parte de fases futuras, no de esta.

## 4. Alternativas consideradas

| Alternativa | Por qué no se eligió |
|---|---|
| CRA / Vite (SPA pura) en vez de Next.js | Sin SSG/SSR no hay buen SEO para las fichas de producto, y Next.js sigue siendo React |
| Base de datos (Postgres/Supabase) desde el día 1 | Complejidad y (eventual) costo innecesarios para un catálogo de solo lectura actualizado manualmente |
| Exponer margen vía `NEXT_PUBLIC_MARGIN_PERCENT` | Filtra información de negocio sensible al bundle del cliente; ver sección 2.3 |
| Mostrar precio_lista_laca en el JSON público desde el inicio | Válido como estrategia de marketing ("antes/ahora"), pero se deja como decisión de negocio explícita a tomar después, no default (ver PRD RNF-03) |

**Extracción del PDF de LACA (spec 0008, 2026-09-12):**

| Alternativa | Por qué no se eligió |
|---|---|
| TypeScript + `pdfjs-dist` (mantener el repo en un solo lenguaje) | El PDF real de LACA no tiene un orden de texto confiable por stream — en algunas páginas el extractor lineal entrega primero todos los precios de la página en un bloque, luego todos los "Ptos", y recién al final los pares código+nombre, sin relación con la fila visual. Reconstruir eso a mano (clustering por posición X/Y, tolerancias, límites de columna que se corren por sección) es lógica nueva de riesgo alto para un dato que termina siendo precio público — se prefirió una librería con heurísticas de tabla ya probadas para ese escenario |
| Go (`unipdf`/`pdfcpu`) | Ecosistema débil para extracción de tablas con conciencia de layout: las libs libres son de manipulación (merge/split/OCR), no de reconstrucción de tablas sin líneas de grilla; las que sirven para esto son comerciales. No compensa con mejor tooling el costo de sumar un tercer lenguaje |
| **Elegido: Python + `pdfplumber`**, acotado a `scripts/pdf/extract.py` | Heurísticas de extracción de tabla por posición ya maduras para tablas sin líneas de grilla (como esta, con bloques de color en vez de bordes). Coloca el `parse fiel de tabla` — la parte de mayor riesgo — sobre una librería probada en vez de código nuevo. Costo aceptado: primer archivo no-TypeScript del repo (constitution §III.11), con su propio `requirements.txt`/venv documentado en el README; nunca corre en runtime ni Vercel, y su output es la única interfaz con el resto del pipeline (TypeScript) — `data/raw/…` y `data/reference/laca_pdf_precios.csv` |

## 5. Roadmap de implementación

1. Setup Next.js + Tailwind + estructura de carpetas (sección 2.5).
2. Script de ingesta con dataset de prueba chico (10-20 productos).
3. Digitalizar `laca_precios_publicos.json` desde el catálogo PDF.
4. Componentes UI: grilla, tarjeta, filtros, buscador, ficha de producto.
5. Deploy en Vercel, validar flujo completo end-to-end.
6. (Fuera de este RFC) Carrito + pagos, panel admin, multi-proveedor activo — requieren RFCs propios.
