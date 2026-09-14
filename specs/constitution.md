# Constitution — RenovArte Catalog

Non-negotiable principles for this project. Every spec, plan, PR and review is
checked against this file. Amending it requires a note in the PR description
explaining why.

Source of truth: [PRD](../docs/PRD/PRD-catalogo-renovarte.md) and
[RFC-0001](../docs/rfc/0001-arquitectura-catalogo.md).

---

## I. Security invariants (business-critical)

These come from RFC-0001 §2.3 / §2.5 / §3 and PRD RNF-03. A violation is a release
blocker, not a nit.

> **Post-migración (2026-09):** ingesta, precio (costo, margen, PDF de
> LACA) y ofertas ya no viven en este repo — se movieron a
> [`renovarte-pipeline`](https://github.com/gucastillo-personal/renovarte-pipeline).
> Este repo es de solo presentación: recibe `public/data/products.json`
> únicamente vía Pull Request de ese repo, nunca lo genera. Las
> invariantes de esa etapa (margen server-only, inputs sensibles
> gitignored, etc.) ahora son responsabilidad de `renovarte-pipeline` — ver
> su propio README y `constitution`-equivalente ahí. Lo que sigue abajo es
> lo que sigue aplicando de *este* lado (el extremo receptor).

1. **No cost, no margin, no LACA list price in anything public.** The real
   purchase cost (`precio_costo` / `costo`), the applied margin
   (`margen`, `margin_percent`), and LACA's public list price must never appear
   in any committed file under `public/` or `src/`, nor in the client JavaScript
   bundle. Only the already-computed `precio_venta` (and, when on offer,
   `precio_regular`/`descuento_pct`) is public.
2. **`public/data/products.json` only changes via Pull Request from
   `renovarte-pipeline`.** Never edited by hand, never generated locally in
   this repo. The PR diff is the review point — merge is always manual,
   never auto-merge.
3. **Leak check is part of "done".** `pnpm run check:leak` must pass (no
   forbidden tokens in build output) before any deploy — the last line of
   defense in case something sensitive slips through the PR review.

## II. Architecture

4. **No database, no runtime backend.** Data is a static
   `public/data/products.json`. Anything needing dynamic state (cart, live stock)
   is a future phase with its own RFC (PRD §4.2, §9).
5. **$0 infrastructure.** Free tiers only in Phase 1 (RNF-01).
6. **Static-first rendering.** Pages are statically generated (SSG). Fast initial
   load, good SEO for product detail pages (RNF-02, RFC §4).
7. **Multi-provider ready, single-provider active.** The `proveedor` field exists
   in the schema from day one; only LACA is loaded in Phase 1 (RFC §2.4).
8. **Public product schema is exactly RFC §2.4.** Keys stay in Spanish
   (`proveedor`, `categoria`, `nombre`, `presentacion`, `descripcion`,
   `precio_venta`, `imagen`, `en_oferta`, `tags`). Adding a key requires an RFC
   amendment **in both repos** — `renovarte-pipeline` produces the schema,
   this repo consumes it.

## III. Code quality

9. **TypeScript strict.** No `any` in committed code except at clearly-marked
   parse boundaries, immediately narrowed by a runtime guard. 100% TypeScript
   — the Python exception for PDF extraction (spec 0008) never landed here;
   that logic was built directly in `renovarte-pipeline` instead.
10. **Mobile-first, responsive, accessible.** Design for ~390px width first; no
    horizontal scroll; semantic HTML; images have `alt` (RNF-04).
11. **Portfolio-grade.** Readable code, meaningful names, a README that lets a
    stranger run and understand the project (RNF-05, PRD §2.2).
12. **Tests gate features.** Each feature names how it is verified in its
    `spec.md` and ships the corresponding Vitest and/or Playwright test.

## IV. Spec-Driven Development workflow

13. **Spec before code.** No feature code is written before its `spec.md`
    (acceptance criteria citing RF/RNF IDs) and `tasks.md` exist and are approved.
14. **Traceability.** Every acceptance criterion references a PRD requirement ID.
    [`specs/README.md`](./README.md) holds the requirement → spec → status matrix.
15. **Small, ordered, verifiable tasks.** Each `tasks.md` item ends in a
    checkable outcome (build passes, a named test is green, a page renders).
16. **Done means demonstrated.** A feature is done only when all its tasks are
    checked and its acceptance criteria are shown to be met.
