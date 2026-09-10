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
| [0002](./0002-ingest-script/spec.md) | Ingest script (CSV → products.json, margin from env) | Backlog |
| [0003](./0003-category-filter/spec.md) | Category filter | Backlog |
| [0004](./0004-search/spec.md) | Name search | Backlog |
| [0005](./0005-offer-indicator/spec.md) | Offer indicator | Backlog |
| [0006](./0006-branding/spec.md) | Branding (logo, palette, meta, favicon) | Backlog |
| [0007](./0007-margin-report/spec.md) | Internal margin report | Backlog |
| [0008](./0008-reference-data/spec.md) | LACA public reference data | Backlog |

## Traceability matrix (PRD requirement → spec → status)

| Requirement | Summary | Spec(s) | Status |
|-------------|---------|---------|--------|
| RF-01 | Product grid: image, name, presentation, price | 0001 | Built (e2e green); live after deploy |
| RF-02 | Filter by category | 0003 | Backlog |
| RF-03 | Search by text (name) | 0004 | Backlog |
| RF-04 | Product detail page | 0001 | Built (SSG + e2e green); live after deploy |
| RF-05 | Mark products on offer | 0005 | Backlog (badge rendered in 0001, full behavior in 0005) |
| RF-06 | Price = cost + configurable margin; never show cost | 0002 | Backlog |
| RF-07 | Catalog updated by a local script regenerating the data file | 0002 | Backlog |
| RF-08 | Margin configurable by env var, no code change | 0002 | Backlog |
| RF-09 | Internal (non-public) report: own price vs LACA public price | 0007 | Backlog |
| RNF-01 | $0 hosting / infra (free tier) | 0001 | Pending Vercel deploy (T15) |
| RNF-02 | Fast initial load (static catalog, no runtime backend/DB) | 0001 | Built — build output all Static/SSG |
| RNF-03 | Cost / margin / LACA list price absent from public files and JS bundle | 0001, 0002, 0007 | Enforced by `pnpm check:leak` (green) + unit test on seed keys |
| RNF-04 | Responsive, usable on mobile | 0001, 0006 | Built (no h-scroll @390px, e2e); polish in 0006 |
| RNF-05 | Own repo, documented, portfolio-grade | 0001, 0006 | Built — README + specs; deploy pending |
