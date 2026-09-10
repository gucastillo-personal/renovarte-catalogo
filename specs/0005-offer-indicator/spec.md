# 0005 — Offer indicator

**Status:** Built + revisión: `data/offers.json` soporta `descuento_pct` por código. OfferBadge + /ofertas. Gate verde (134 unit + 12 e2e). 1 oferta activa (511950004, 10%).
**PRD:** RF-05
**RFC:** §2.4 (`en_oferta` field)

## Why

RenovArte runs promotions. Clients should be able to spot discounted products at
a glance in the grid and on the detail page.

## User value

- Products on offer carry a clear visual badge in the grid and detail view; the
  client can tell what's promoted without opening each product.

## Scope

In:
- `src/components/OfferBadge.tsx` — accessible badge (text + colour, not colour
  alone), shown when `product.en_oferta === true`.
- Badge on `ProductCard` and on the product detail page.
- Optional: an "Ofertas" entry in `CategoryNav` (from 0003) that lists all
  `en_oferta` products, at `/ofertas`.
- Styling uses the sage/beige palette; the badge must meet WCAG AA contrast.

Out: computing whether something is on offer (that's a data/ingest concern — the
field is authored upstream); "before/after" price display (that depends on the
deferred `precio_lista_laca` business decision, RFC §4).

## Acceptance criteria

1. **AC-1 (RF-05):** A product with `en_oferta: true` shows the badge on its card
   and on its detail page; a product with `false` shows no badge. *Verified by:*
   Playwright against seed data with both cases; Vitest on the render condition.
2. **AC-2 (a11y):** The badge conveys "oferta" via text, not colour alone, and
   passes AA contrast. *Verified by:* manual axe check / review.
3. **AC-3 (stretch):** `/ofertas` lists exactly the `en_oferta` products.
   *Verified by:* Playwright.
