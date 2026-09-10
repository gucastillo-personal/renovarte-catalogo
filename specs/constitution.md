# Constitution — RenovArte Catalog

Non-negotiable principles for this project. Every spec, plan, PR and review is
checked against this file. Amending it requires a note in the PR description
explaining why.

Source of truth: [PRD](../docs/PRD-catalogo-renovarte.md) and
[RFC-0001](../docs/rfc/0001-arquitectura-catalogo.md).

---

## I. Security invariants (business-critical)

These come from RFC-0001 §2.3 / §2.5 / §3 and PRD RNF-03. A violation is a release
blocker, not a nit.

1. **No cost, no margin, no LACA list price in anything public.** The real
   purchase cost (`precio_costo` / `costo`), the applied margin
   (`margen`, `margin_percent`), and LACA's public list price must never appear
   in any committed file under `public/` or `src/`, nor in the client JavaScript
   bundle. Only the already-computed `precio_venta` is public.
2. **Margin config is server/local only.** Margin env vars use
   `MARGIN_PERCENT_*` with **no `NEXT_PUBLIC_` prefix**. They are read only by the
   local ingest script (Node, developer machine). They are never set in Vercel.
3. **Sensitive inputs are gitignored.** `data/raw/`, `data/private/` and
   `.env.local` are never committed. `data/reference/` (public market prices from
   the LACA PDF) **is** committed — it is public information.
4. **The ingest script never runs in production.** It runs locally; its output
   (`public/data/products.json`) is what gets committed and deployed.
5. **Leak check is part of "done".** `pnpm run check:leak` must pass (no
   forbidden tokens in build output) before any deploy.

## II. Architecture

6. **No database, no runtime backend.** Data is a static
   `public/data/products.json`. Anything needing dynamic state (cart, live stock)
   is a future phase with its own RFC (PRD §4.2, §9).
7. **$0 infrastructure.** Free tiers only in Phase 1 (RNF-01).
8. **Static-first rendering.** Pages are statically generated (SSG). Fast initial
   load, good SEO for product detail pages (RNF-02, RFC §4).
9. **Multi-provider ready, single-provider active.** The `proveedor` field exists
   in the schema from day one; only LACA is loaded in Phase 1 (RFC §2.4).
10. **Public product schema is exactly RFC §2.4.** Keys stay in Spanish
    (`proveedor`, `categoria`, `nombre`, `presentacion`, `descripcion`,
    `precio_venta`, `imagen`, `en_oferta`, `tags`). Adding a key requires an RFC
    amendment.

## III. Code quality

11. **TypeScript strict.** No `any` in committed code except at clearly-marked
    parse boundaries, immediately narrowed by a runtime guard.
12. **Mobile-first, responsive, accessible.** Design for ~390px width first; no
    horizontal scroll; semantic HTML; images have `alt` (RNF-04).
13. **Portfolio-grade.** Readable code, meaningful names, a README that lets a
    stranger run and understand the project (RNF-05, PRD §2.2).
14. **Tests gate features.** Each feature names how it is verified in its
    `spec.md` and ships the corresponding Vitest and/or Playwright test.

## IV. Spec-Driven Development workflow

15. **Spec before code.** No feature code is written before its `spec.md`
    (acceptance criteria citing RF/RNF IDs) and `tasks.md` exist and are approved.
16. **Traceability.** Every acceptance criterion references a PRD requirement ID.
    [`specs/README.md`](./README.md) holds the requirement → spec → status matrix.
17. **Small, ordered, verifiable tasks.** Each `tasks.md` item ends in a
    checkable outcome (build passes, a named test is green, a page renders).
18. **Done means demonstrated.** A feature is done only when all its tasks are
    checked and its acceptance criteria are shown to be met.
