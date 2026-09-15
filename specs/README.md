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

_El reporte interno de márgenes (ex 0007) se eliminó — se abordará por otra
vía. El 0008 original ("referencia de precios públicos de LACA") se deprecó y
el número se reutilizó para esta nueva spec, con un objetivo distinto (fuente
de precio alternativa, no reporte)._

## Traceability matrix (PRD requirement → spec → status)

| Requirement | Summary | Spec(s) | Status |
|-------------|---------|---------|--------|
| RF-01 | Product grid: image, name, presentation, price | 0001 | Done — deployed on Vercel |
| RF-02 | Filter by category | 0003, 0012 | Built — 24 páginas de categoría SSG, chip activo con aria-current; 0012 corrigió el color del chip (sage-100 inactivo / sage-500 activo) para que coincida con `docs/brand.md` |
| RF-03 | Search by text (name) | 0004 | Built — filtro cliente accent-insensitive, sin red; anda dentro de categoría |
| RF-04 | Product detail page | 0001 | Done — SSG, deployed |
| RF-05 | Mark products on offer | 0005, 0007 | Built — badge/chip en card+ficha; con descuento muestra antes tachado + −N% + precio final (data/offers.json) |
| RF-06 | Price = cost + configurable margin; never show cost | 0002, 0009 | Migrado a `renovarte-pipeline` |
| RF-07 | Catalog updated by a local script regenerating the data file | 0002, 0009 | Migrado a `renovarte-pipeline` (`make ingest && make transform`, manual) |
| RF-08 | Margin configurable by env var, no code change | 0002 | Migrado a `renovarte-pipeline` |
| RF-09 | Internal (non-public) report: own price vs LACA public price | — | Sin spec — nunca se implementó de este lado ni del nuevo |
| RF-10 | Precio desde PDF de LACA (ABC/Catálogo), decisión manual por producto; Precio Profesional (costo) nunca publicable | 0008 | Migrado a `renovarte-pipeline`, con precio automático (sin revisión manual) en vez del selector descripto en 0008 |
| RNF-01 | $0 hosting / infra (free tier) | 0001 | Done — Vercel free tier |
| RNF-02 | Fast initial load (static catalog, no runtime backend/DB) | 0001, 0009 | Done — all Static/SSG; ingesta corre fuera de este repo por completo |
| RNF-03 | Cost / margin / LACA list price absent from public files and JS bundle | 0001, 0002, 0009 | Enforced de este lado por `check:leak` + `validateProducts`; el cálculo de costo/margen en sí vive en `renovarte-pipeline` |
| RNF-04 | Responsive, usable on mobile | 0001, 0006, 0012 | Done — sin h-scroll a 390/768/1280 (e2e), paleta + tipografía de marca; 0012 verificó el contraste del nuevo par activo `sage-500`/`beige-50` (≈3.17:1 — pasa AA para UI/texto grande ≥3:1, no el umbral de 4.5:1 de texto normal; reportado al CTO/CEO, implementado tal cual pide el spec sin oscurecer el color) |
| RNF-05 | Own repo, documented, portfolio-grade | 0001, 0006, 0012 | Done — repo + README + specs + docs/brand.md, deployed; 0012 corrigió un caso donde el código no seguía `docs/brand.md` (chips de `CategoryNav`) |
| RF-11 | Sección de misión/marca en la home, como bloque principal (antes que el catálogo) | 0011 | Built — `MissionSection` (carrusel scroll-snap de 5 mensajes, `h1`) primero en `<main>` |
| RF-12 | Catálogo de productos pasa a secundario en la home, sin perder funcionalidad (RF-01 a RF-04) | 0011 | Built — heading bajado a `h2`, `CategoryNav`/`CatalogView` sin cambios, e2e de spec 0001/0003/0004/0005 en verde |
