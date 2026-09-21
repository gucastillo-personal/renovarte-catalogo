# Specs — Spec-Driven Development

This folder is the source of truth for *what* we build and *why*, ahead of code.
It is a lightweight, in-repo convention — no external CLI.

## Layout

```
specs/
├── constitution.md          # non-negotiable principles + security invariants
├── README.md                # this file: workflow + traceability matrix
└── NNNN-slug/
    ├── spec.md              # WHAT & WHY — user value, acceptance criteria (cite RF/RNF)
    ├── plan.md              # HOW — files, components, data shape, test approach
    └── tasks.md             # ordered [ ] checkboxes, each independently verifiable
```

Backlog features carry only `spec.md` until they are picked up; `plan.md` and
`tasks.md` are written when work starts.

## Workflow

1. **Specify** — write / refine `spec.md`. Acceptance criteria only, each citing a
   PRD requirement ID (`RF-0x` / `RNF-0x`). No implementation detail.
2. **Plan** — write `plan.md`: concrete files, reused utilities, data shapes,
   how it will be tested. Checked against [`constitution.md`](./constitution.md).
3. **Tasks** — break `plan.md` into `tasks.md`: small, ordered steps, each ending
   in a checkable outcome.
4. **Implement** — work the tasks top to bottom, checking them off.
5. **Verify** — demonstrate every acceptance criterion (named test or manual
   step). Update the matrix below to `Done`.

## Feature index

| ID | Feature | Status |
|----|---------|--------|
| [0001](./0001-walking-skeleton/spec.md) | Walking skeleton (scaffold + grid + detail + deploy) | In progress — code complete, deploy pending |
| [0002](./0002-ingest-script/spec.md) | Ingest script — CSV → products.json, margin from env | **Migrado a `renovarte-pipeline`** (2026-09) — ver su `PLAN.md` en `renovarte-parent` |
| [0009](./0009-api-ingest/spec.md) | Ingesta serlaca en 2 etapas (`pnpm ingest` crudo → `pnpm transform`) | **Migrado a `renovarte-pipeline`** (2026-09) |
| 0010 | GitHub Action programado que corre la ingesta | **Migrado a `renovarte-pipeline`** (2026-09) — la Action vive ahí, este repo solo recibe el PR |
| [0003](./0003-category-filter/spec.md) | Category filter (/categoria/[slug], CategoryNav) | Built (115 unit + 8 e2e); 24 categorías |
| [0004](./0004-search/spec.md) | Name search (SearchBox + CatalogView, filtro cliente) | Built (121 unit + 11 e2e) |
| [0005](./0005-offer-indicator/spec.md) | Offer indicator (data/offers.json + descuento_pct + OfferBadge + /ofertas) | Built (134 unit + 12 e2e); 1 oferta activa — `data/offers.json` ahora vive en `renovarte-pipeline` |
| [0006](./0006-branding/spec.md) | Branding (logo real, paleta, tipografía, OG, manifest) | Built (135 unit + 15 e2e) |
| [0007](./0007-offer-pricing/spec.md) | Precio de oferta (antes / % / ahora) en card y ficha | Built (143 unit + 17 e2e) |
| [0008](./0008-pdf-price-override/spec.md) | Precio desde PDF de LACA (Profesional=costo / ABC / Catálogo) | **Migrado a `renovarte-pipeline`**, e implementado con un diseño distinto al de este spec.md: precio del PDF automático (`max(ABC, costo+margen)`, sin revisión manual por producto) en vez del selector ABC/Catálogo/Actual descripto acá |
| [0011](./0011-mision-home/spec.md) | Sección de misión/nosotros como centro de la home (catálogo pasa a secundario) | Built (59 unit + 24 e2e totales; +8 unit / +6 e2e de este feature) |
| [0012](./0012-consistencia-chips-categoria/spec.md) | Fix de consistencia visual: chips de `CategoryNav` deben usar los tokens de `docs/brand.md` (sage-100 inactivo / sage-500 activo) — no agrega RF/RNF nuevos | Built (63 unit + 24 e2e totales; +4 unit de este feature) |
| [0013](./0013-ux-card-producto/spec.md) | Revisión de UX del cuerpo de `ProductCard` (fondo `beige-100`, padding asimétrico `pt-3 px-3.5 pb-4`, nombre `text-sm font-semibold`) **y** de la densidad de columnas de `ProductGrid` (`grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))]`, responsivo por ancho de contenedor en vez de columnas fijas por breakpoint — hasta 5 columnas a `max-w-6xl`) — sin fuente de verdad hoy en `docs/brand.md` antes de este spec, ahora documentada ahí; no agrega RF/RNF nuevos | Built (66 unit + 27 e2e totales; +3 unit / +3 e2e de este feature) |
| [0014](./0014-contraste-precio-anterior/spec.md) | Fix de contraste: precio anterior tachado en `ProductPrice` (`text-sage-500` → color que pase AA 4.5:1) sobre los dos fondos donde se usa — `beige-100` en `ProductCard` y `beige-50` heredado en la ficha de detalle; problema preexistente, detectado por el `tester-agent` al verificar 0012/0013; no agrega RF/RNF nuevos | Backlog |
| [0015](./0015-agrupacion-categorias/spec.md) | Navegación/filtro de categorías en dos niveles (agrupación de alto nivel — Cuidado facial / Cuidado corporal / Cosmética / fallback genérico, fuente `codCategoria` — y dentro de cada una las categorías específicas ya existentes), en vez de la única lista plana de pills de hoy; mapeo id→nombre es responsabilidad exclusiva de `renovarte-pipeline` (no se redefine acá) | **Built** (Fase 1 T1–T18 + Fase 2 T19–T22): `renovarte-pipeline` publicó `codCategoria` (384 productos) y `serlaca_category_groups.json` (4 nombres) vía PR #8 (`pipeline/auto-update-products`), desbloqueando Fase 2. Schema (`codCategoria: string[]`, soporta pertenencia a 2+ grupos, confirmado contra la API real), lógica de agrupación (`deriveCategoriaGrupoMap`/`deriveGroupList`/`codCategoriasOf`), loader tolerante, y UI de dos niveles según `ux.md` (aprobado por el CTO/CEO): nivel 1 (`CategoryNav`) muestra un chip por grupo real (3 de 4 — "Otros"/`codCategoria "4"` tiene 0 productos hoy, se omite igual que "Ofertas"); nivel 2 (`GroupCategoryNav`) con etiqueta visible y chips más chicos, soporta que una categoría pertenezca a 2+ grupos (unión deduplicada) — **confirmado con datos reales**: 11 de 24 categorías (ej. "Labios", "Uñas") caen en 2+ grupos a la vez, aunque ningún producto individual carga hoy 2+ ids en su propio `codCategoria` (la ambigüedad es siempre entre productos de la misma categoría, no dentro de un mismo producto); `/grupo/[slug]` (3 páginas SSG) y chips de grupo en `/producto/[id]`. Acceder a una categoría específica desde `/` pasa a ser un flujo de 2 clicks (elegir grupo → categoría), por diseño de AC-1 — las 2 suites e2e de spec 0003 que antes probaban el flujo de 1 click se actualizaron a propósito (tasks.md T20(b), autorizado por `ux.md`). `pnpm gate` completo en verde: lint, build (3 páginas `/grupo/*` SSG), typecheck, 111 tests unitarios (0 skip), `check:leak`, 31 tests e2e (1 skip, sin oferta flag-only hoy) |

_El reporte interno de márgenes (ex 0007) se eliminó — se abordará por otra
vía. El 0008 original ("referencia de precios públicos de LACA") se deprecó y
el número se reutilizó para esta nueva spec, con un objetivo distinto (fuente
de precio alternativa, no reporte)._

## Traceability matrix (PRD requirement → spec → status)

| Requirement | Summary | Spec(s) | Status |
|-------------|---------|---------|--------|
| RF-01 | Product grid: image, name, presentation, price | 0001, 0013 | Done — deployed on Vercel; 0013 definió con UX y construyó fondo (`beige-100`), padding (`pt-3 px-3.5 pb-4`) y tipografía del nombre (`text-sm font-semibold`) del cuerpo de la card, y el nuevo layout de `ProductGrid` por ancho de contenedor (hasta 5 columnas), sin cambiar qué datos muestra — `tests/unit/product-card.test.tsx` (AC-1) |
| RF-02 | Filter by category | 0003, 0012, 0013 | Built — 24 páginas de categoría SSG, chip activo con aria-current; 0012 corrigió el color del chip (sage-100 inactivo / sage-500 activo) para que coincida con `docs/brand.md`; 0013 confirmó que el nuevo layout de `ProductGrid` no rompe el filtrado por categoría (suite e2e de spec 0003 en verde, AC-9) |
| RF-03 | Search by text (name) | 0004, 0013 | Built — filtro cliente accent-insensitive, sin red; anda dentro de categoría; 0013 confirmó que el nuevo layout de `ProductGrid` no rompe la búsqueda (suite e2e de spec 0004 en verde, AC-9) |
| RF-04 | Product detail page | 0001 | Done — SSG, deployed |
| RF-05 | Mark products on offer | 0005, 0007, 0013, 0014 | Built — badge/chip en card+ficha; con descuento muestra antes tachado + −N% + precio final (data/offers.json); 0013 confirmó que la legibilidad de `OfferBadge` no se degrada con el nuevo fondo del cuerpo (badge no comparte superficie con el cuerpo; suites e2e de spec 0005/0007 en verde, AC-3); 0014 (Backlog) corrige el contraste sub-AA del precio anterior tachado (`text-sage-500` → color AA), preexistente en ambos fondos donde se usa |
| RF-06 | Price = cost + configurable margin; never show cost | 0002, 0009 | Migrado a `renovarte-pipeline` |
| RF-07 | Catalog updated by a local script regenerating the data file | 0002, 0009 | Migrado a `renovarte-pipeline` (`make ingest && make transform`, manual) |
| RF-08 | Margin configurable by env var, no code change | 0002 | Migrado a `renovarte-pipeline` |
| RF-09 | Internal (non-public) report: own price vs LACA public price | — | Sin spec — nunca se implementó de este lado ni del nuevo |
| RF-10 | Precio desde PDF de LACA (ABC/Catálogo), decisión manual por producto; Precio Profesional (costo) nunca publicable | 0008 | Migrado a `renovarte-pipeline`, con precio automático (sin revisión manual) en vez del selector descripto en 0008 |
| RNF-01 | $0 hosting / infra (free tier) | 0001 | Done — Vercel free tier |
| RNF-02 | Fast initial load (static catalog, no runtime backend/DB) | 0001, 0009 | Done — all Static/SSG; ingesta corre fuera de este repo por completo |
| RNF-03 | Cost / margin / LACA list price absent from public files and JS bundle | 0001, 0002, 0009 | Enforced de este lado por `check:leak` + `validateProducts`; el cálculo de costo/margen en sí vive en `renovarte-pipeline` |
| RNF-04 | Responsive, usable on mobile | 0001, 0006, 0012, 0013, 0014 | Done — sin h-scroll a 390/768/1280 (e2e), paleta + tipografía de marca; 0012 verificó el contraste del nuevo par activo `sage-500`/`beige-50` (≈3.17:1 — pasa AA para UI/texto grande ≥3:1, no el umbral de 4.5:1 de texto normal; reportado al CTO/CEO, implementado tal cual pide el spec sin oscurecer el color); 0013 construyó el grid responsivo por ancho de contenedor (`auto-fill`/`minmax(190px,1fr)`, hasta 5 columnas en pantallas anchas en vez del tope fijo de 3) y verificó con e2e (`getBoundingClientRect`) que a 390px y al mínimo de 190px de columna el nombre real más largo del catálogo (62 caracteres) y el precio no se superponen ni generan scroll horizontal (AC-4, AC-7, AC-8); 0014 (Backlog) corrige el precio anterior tachado (`ProductPrice`), sub-AA (~3.0–3.4:1) en ambos fondos donde se usa desde antes de 0013 — no introducido por ninguna spec previa |
| RNF-05 | Own repo, documented, portfolio-grade | 0001, 0006, 0012, 0013, 0014 | Done — repo + README + specs + docs/brand.md, deployed; 0012 corrigió un caso donde el código no seguía `docs/brand.md` (chips de `CategoryNav`); 0013 formalizó en `docs/brand.md` el fondo/tipografía del cuerpo de `ProductCard` (extensión de uso de `beige-100`/`sage-800`, nuevos bullets de padding y tipografía) y el layout de `ProductGrid`, cerrando la falta de definición de UX que el spec identificó — nota: el contraste del precio anterior tachado (`sage-500` en `ProductPrice`) ya estaba sub-AA antes de este spec (~3.4:1 sobre `bg-white`) y queda ~3.0:1 sobre el nuevo `beige-100`; no se corrigió acá (tocar `ProductPrice` arriesgaba `size="lg"` de la ficha de detalle, fuera de alcance) — reportado como posible spec de corrección futuro; **0014 (Backlog)** es esa corrección: `sage-500` → `sage-600` (ya documentado en `brand.md` como "texto secundario sobre crema, contraste AA"), pasa a ≈5.0:1 sobre `beige-100` y ≈5.3:1 sobre `beige-50` (ficha de detalle, confirmado también sub-AA ≈3.17:1 antes del fix) |
| RF-11 | Sección de misión/marca en la home, como bloque principal (antes que el catálogo) | 0011 | Built — `MissionSection` (carrusel scroll-snap de 5 mensajes, `h1`) primero en `<main>` |
| RF-12 | Catálogo de productos pasa a secundario en la home, sin perder funcionalidad (RF-01 a RF-04) | 0011 | Built — heading bajado a `h2`, `CategoryNav`/`CatalogView` sin cambios, e2e de spec 0001/0003/0004/0005 en verde |
| RF-13 | Navegación/filtro de categorías en dos niveles (agrupación de alto nivel — `codCategoria`: Cuidado facial / Cuidado corporal / Cosmética / fallback — + categoría específica) | 0015 | **Built** — lógica de agrupación, schema (`codCategoria: string[]`, soporta pertenencia a 2+ grupos), loader tolerante y UI de dos niveles construidos según el diseño de `ux.md` (aprobado por el CTO/CEO), verificado contra datos reales de `renovarte-pipeline` (`codCategoria` en 384 productos + `serlaca_category_groups.json`, 3 de 4 grupos con productos hoy), `pnpm gate` completo en verde |
