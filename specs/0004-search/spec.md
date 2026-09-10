# 0004 — Name search

**Status:** Built. Filtro cliente (sin red), gate verde (121 unit + 11 e2e).
**PRD:** RF-03
**RFC:** §2.5 (`FilterBar`)

## Why

Clients often know the product name and want to jump straight to it instead of
scanning the grid.

## User value

- Typing in a search box filters the visible grid by product name in real time,
  on any device, with no page reload.

## Scope

In:
- `src/components/SearchBox.tsx` (Client Component) — controlled input.
- Client-side filter over the already-loaded product list (accent- and
  case-insensitive substring match on `nombre`; optionally `tags`).
- Works on home and (optionally) category pages, combining with the category
  filter from 0003.
- Empty-state message when nothing matches.
- Debounced input; result count shown.
- No backend, no query param round-trip required (optional `?q=` sync for
  shareable searches is a stretch goal).

Out: fuzzy ranking, typo tolerance, server-side search, search over description.

## Acceptance criteria

1. **AC-1 (RF-03):** Typing a substring of a product name reduces the grid to the
   matching products; clearing the box restores the full grid. *Verified by:*
   Playwright + Vitest on the pure `matchProducts(query, products)` helper.
2. **AC-2:** Search is accent- and case-insensitive (`"solar"` matches
   `"Protección Solar"`). *Verified by:* Vitest.
3. **AC-3:** No matches shows a friendly empty state, not a blank page.
   *Verified by:* Playwright.
4. **AC-4 (RNF-02):** Search adds no network requests and no measurable input
   lag on the full catalog. *Verified by:* manual + Playwright no-request
   assertion.
5. **AC-5:** When combined with a category page (0003), search filters within
   that category only. *Verified by:* Playwright.
