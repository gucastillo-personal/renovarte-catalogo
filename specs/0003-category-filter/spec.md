# 0003 — Category filter

**Status:** Backlog
**PRD:** RF-02
**RFC:** §2.5 (`app/categoria/[slug]/page.tsx`, `CategoryNav`)

> Impl note: `getCategories()` already exists in `src/lib/products.ts` (added in
> 0002). Tailwind v4 — style with the `sage`/`beige` tokens from `globals.css`,
> no `tailwind.config.ts`. Next 16 — `params` is a `Promise`, `await` it.

## Why

The LACA catalog spans several categories (Antiage, Protección solar, Corporales,
Cuidados básicos, ...). Clients need to narrow the grid to one category.

## User value

- From the home page a client picks a category and sees only those products, with
  a shareable URL for that category.

## Scope

In:
- Categories derived at build time from `getAllProducts()` (no hardcoded list).
- `src/components/CategoryNav.tsx` — links to `/` (all) and each
  `/categoria/[slug]`, current one highlighted.
- `src/app/categoria/[slug]/page.tsx` — `generateStaticParams` from the derived
  categories; filtered grid reusing `ProductCard`; `notFound()` for unknown slug.
- Slug helper: `categoria` → URL slug and back (accent-insensitive, stable).
- `CategoryNav` shown on home and category pages.

Out: multi-select / combined filters; search (→ 0004); tag filtering.

## Acceptance criteria

1. **AC-1 (RF-02):** `/categoria/antiage` renders only products whose `categoria`
   maps to that slug; the count matches the data. *Verified by:* Playwright +
   Vitest on the filter helper.
2. **AC-2:** Every category present in `products.json` has a working page listed
   in `pnpm build` output; a slug with no products 404s. *Verified by:* build
   output + Playwright.
3. **AC-3:** `CategoryNav` marks the active category (aria-current) and links
   back to "all". *Verified by:* Playwright.
4. **AC-4 (RNF-04):** Category pages have no horizontal scroll at 390px.
   *Verified by:* Playwright viewport check.
