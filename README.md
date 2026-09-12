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
| `pnpm ingest` | **Etapa 1** — baja el catálogo crudo de la API de serlaca → `data/input/serlaca-raw.json` (spec [`0009`](./specs/0009-api-ingest/spec.md)) |
| `pnpm transform` | **Etapa 2** — `data/input/` (o `--in <csv>`) → `public/data/products.json` con margen + limpieza |
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

`public/data/products.json` se genera en **dos etapas separadas** (descarga vs.
lógica de negocio — spec [`0009`](./specs/0009-api-ingest/spec.md)):

```
pnpm ingest      # 1. API serlaca → data/input/serlaca-raw.json   (crudo, sin tocar)
pnpm transform   # 2. data/input/ → public/data/products.json     (descuento + margen + limpieza)
```

1. `cp .env.example .env.local` y completar. **Etapa 1**: `SERLACA_API_KEY`,
   `SERLACA_LACA_ID`. **Etapa 2**: `MARGIN_PERCENT_DEFAULT` (+ overrides por
   categoría opcionales), `SERLACA_IMAGE_BASE`. Todo **sin** `NEXT_PUBLIC_`,
   nunca en Vercel.
2. `pnpm ingest` → `data/input/serlaca-raw.json` (gitignored, ~1 MB; se re-baja
   cuando haga falta).
3. `pnpm transform` → excluye productos de uso profesional exclusivo, toma el
   `price` como costo y le suma `MARGIN_PERCENT`, limpia nombres de categoría,
   marca en oferta los `productCode` de `data/offers.json` (spec
   [`0005`](./specs/0005-offer-indicator/spec.md)), reescribe
   `public/data/products.json`. Determinístico: correrlo dos veces no cambia el
   archivo.
4. `git commit public/data/products.json` + `git push` → deploy en Vercel.

Ofertas: editá `data/offers.json` — `{ "codigos": { "<productCode>": {} } }` para
solo el badge, o `{ "<productCode>": { "descuento_pct": 10 } }` para 10% off. Con
descuento, el producto guarda `precio_regular` (precio sin la promo) además del
`precio_venta` final, y la card/ficha muestran antes tachado + `−N%` + ahora
(spec [`0007`](./specs/0007-offer-pricing/spec.md)). `pnpm transform`, commiteá
y pusheá.

**Fallback CSV** (spec [`0002`](./specs/0002-ingest-script/spec.md)):
`pnpm transform --in data/raw/serlaca_export.sample.csv` — salta la etapa 1 y
transforma un CSV local directamente.

El reporte interno `data/private/margin-report.csv` (precio propio vs. precio
público de LACA) es la spec [`0007`](./specs/0007-margin-report/spec.md), todavía
no implementado.

## Seguridad de negocio

Costo real, margen aplicado y precio de lista de LACA **nunca** viven en
`public/`, `src/`, ni en el bundle del navegador. Ver
[`specs/constitution.md`](./specs/constitution.md) §I. `pnpm check:leak` lo
verifica sobre el output construido.
