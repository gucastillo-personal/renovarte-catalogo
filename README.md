# RenovArte — Catálogo web

Public, read-only catalog to browse products RenovArte resells (LACA in Phase 1),
priced with RenovArte's own margin. No cart, no checkout, no database — a static
`products.json` rendered by Next.js and hosted on Vercel free tier.

- **Product spec:** [`docs/PRD-catalogo-renovarte.md`](./docs/PRD-catalogo-renovarte.md)
- **Architecture:** [`docs/rfc/0001-arquitectura-catalogo.md`](./docs/rfc/0001-arquitectura-catalogo.md)
- **How we build (Spec-Driven Development):** [`specs/`](./specs/) — start with
  [`specs/constitution.md`](./specs/constitution.md) and
  [`specs/README.md`](./specs/README.md).

**Live URL:** _pendiente de primer deploy (spec 0001, tarea T15)._

## Stack

Next.js 16 (App Router, SSG) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
Vitest · Playwright · pnpm · Vercel.

## Requisitos

- Node `>=20.9` (ver [`.nvmrc`](./.nvmrc) — `nvm use`).
- pnpm (`corepack enable pnpm`).

## Puesta en marcha

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción (SSG) |
| `pnpm start` | Sirve el build (`--port` opcional) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end (Playwright; hace `build` + `start`) |
| `pnpm check:leak` | Falla si aparecen costo/margen/precio de lista en el output (`.next/`, `public/data/`) — RNF-03 |

Gate antes de deploy: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm check:leak && pnpm test:e2e`.

## Datos del catálogo

Hoy `public/data/products.json` tiene datos semilla. El flujo real de
actualización (spec [`0002`](./specs/0002-ingest-script/spec.md)) será:

1. Exportar el CSV de costos de serlaca a `data/raw/serlaca_export.csv` (gitignored).
2. `cp .env.example .env.local` y ajustar `MARGIN_PERCENT_*` (sin `NEXT_PUBLIC_`).
3. `pnpm ingest` → regenera `public/data/products.json` (público) y
   `data/private/margin-report.csv` (interno, gitignored — spec
   [`0007`](./specs/0007-margin-report/spec.md)).
4. `git commit` + `git push` → deploy automático en Vercel.

## Seguridad de negocio

Costo real, margen aplicado y precio de lista de LACA **nunca** viven en
`public/`, `src/`, ni en el bundle del navegador. Ver
[`specs/constitution.md`](./specs/constitution.md) §I. `pnpm check:leak` lo
verifica sobre el output construido.
