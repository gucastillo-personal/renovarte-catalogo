# RenovArte — Catálogo web

Public, read-only catalog to browse products RenovArte resells (LACA in Phase 1),
priced with RenovArte's own margin. No cart, no checkout, no database — a static
`products.json` rendered by Next.js and hosted on Vercel free tier.

- **Product spec:** [`docs/PRD/PRD-catalogo-renovarte.md`](./docs/PRD/PRD-catalogo-renovarte.md)
- **Architecture:** [`docs/rfc/0001-arquitectura-catalogo.md`](./docs/rfc/0001-arquitectura-catalogo.md)
- **Marca (paleta, tipografía, logo):** [`docs/brand.md`](./docs/brand.md)
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
| `pnpm gate` | Corre todo en orden: lint · build · typecheck · test · check:leak · e2e (build antes de typecheck: genera los tipos de ruta de Next) |
| `pnpm ship` | `pnpm gate` y, si pasa, `vercel deploy --prod` (deploy a producción) |
| `pnpm ship:preview` | `pnpm gate` y `vercel deploy` (URL de preview) |

## Deploy

Hosting: **Vercel** (proyecto `renovarte`), free tier. Requiere el CLI de Vercel
instalado y logueado una vez:

```bash
npm i -g vercel   # o: pnpm add -g vercel
vercel login
```

Flujo recomendado:

```bash
git add -A && git commit -m "..."   # dejá el trabajo commiteado primero
git push
pnpm ship                           # gate completo + deploy a producción
```

`pnpm ship` **aborta** si falla cualquier chequeo (no sube nada roto). El CLI
sube el código y buildea en Vercel; usa `.vercel/project.json` para saber a qué
proyecto apunta. Si el repo está conectado a Vercel por Git, un `git push` a
`main` también dispara el deploy — en ese caso `pnpm deploy` es opcional.

## Datos del catálogo

`public/data/products.json` **no se genera en este repo** — viene de
[`renovarte-pipeline`](https://github.com/gucastillo-personal/renovarte-pipeline),
un repo Python separado, vía Pull Request. Este repo es puramente de
presentación: lee `public/data/products.json` como un archivo estático más
(`src/lib/products.ts`), sin tocar la API de Serlaca, el PDF de LACA, costo
ni margen — ver [`docs/rfc/0001-arquitectura-catalogo.md`](./docs/rfc/0001-arquitectura-catalogo.md)
para el detalle de la separación y [`specs/constitution.md`](./specs/constitution.md)
para las invariantes de seguridad que siguen aplicando de este lado.

Flujo cuando cambia el catálogo (ingesta, precios del PDF, ofertas — todo
vive y se corre en `renovarte-pipeline`):

1. El admin corre `make ingest && make transform` (y `make pdf-extract`
   cuando cambia el PDF de LACA) en `renovarte-pipeline`.
2. `renovarte-pipeline` abre un PR contra este repo con el
   `public/data/products.json` actualizado (manual vía `make publish-live`,
   o disparando su GitHub Action).
3. Acá solo queda **revisar el diff del PR y mergearlo** — nunca se
   automergea. El merge dispara el deploy en Vercel.

Ofertas (`{ "codigos": { "<productCode>": {} } }` para badge,
`{ "<productCode>": { "descuento_pct": 10 } }` para % off — spec
[`0005`](./specs/0005-offer-indicator/spec.md)/[`0007`](./specs/0007-offer-pricing/spec.md))
se editan en `renovarte-pipeline/data/offers.json`, no acá.

## Seguridad de negocio

Costo real, margen aplicado y precio de lista de LACA **nunca** viven en
`public/`, `src/`, ni en el bundle del navegador. Ver
[`specs/constitution.md`](./specs/constitution.md) §I. `pnpm check:leak` lo
verifica sobre el output construido.
