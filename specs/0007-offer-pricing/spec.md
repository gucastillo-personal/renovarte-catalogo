# 0007 — Precio de oferta (antes / % / ahora)

**Status:** Built. products.json guarda precio_regular/descuento_pct cuando hay promo; ProductPrice + OfferBadge muestran antes/−N%/ahora en card y ficha. Gate verde (143 unit + 17 e2e, 1 skip sin flag-only offer).
**PRD:** RF-05 (ampliación)
**RFC:** §2.4 (enmienda — campos opcionales de oferta)
**Depende de:** 0005 (`data/offers.json` con `descuento_pct`)

## Problema

Hoy, cuando un producto está en oferta con `descuento_pct` (ej. `511950004` a
10%), la transformación aplica el descuento a `precio_venta` y **tira el precio
anterior**. En la web el cliente ve solo el precio final + un badge "Oferta": no
sabe cuánto ahorra ni que hubo una rebaja.

## Objetivo

En la card y en la ficha, un producto en oferta con descuento muestra:
**precio anterior tachado · −N% · precio final**.

## Alcance

**In:**

- **Schema (RFC §2.4, enmienda):** dos campos **opcionales** en `Product`,
  presentes solo cuando el producto está en oferta **con `descuento_pct > 0`**:
  - `precio_regular: number` — el precio de venta sin la promo.
  - `descuento_pct: number` — el porcentaje (entero, ej. `10`).
  `precio_venta` sigue siendo el **precio final** (ya con descuento). Los
  consumidores que solo leen `precio_venta` no cambian.
- Ofertas *flag-only* (`{}` en `offers.json`, badge sin cambio de precio) **no**
  llevan estos campos.
- `scripts/lib/pricing.ts` `buildPublicProduct` calcula y ubica los campos en
  orden de schema (salida determinística).
- `src/lib/types.ts`: `Product` con los opcionales; `isProduct` los valida y
  chequea **coherencia** (si hay `descuento_pct>0` tiene que haber
  `precio_regular` y `precio_regular > precio_venta`).
- `src/components/ProductPrice.tsx` — render del precio (con o sin oferta),
  reusado en `ProductCard` y en la ficha. Precio anterior con `<s>` + texto
  accesible; chip `−N%` con la paleta sage (contraste AA).
- `OfferBadge`: cuando hay descuento, muestra `−N%` en vez de "Oferta"
  (flag-only sigue "Oferta").

**Out:**

- Comparación contra el precio público de LACA (no lo tenemos; ex 0007/0008
  eliminadas).
- Precios de oferta absolutos en `offers.json` (solo `descuento_pct`).
- Cuenta regresiva / fechas de vigencia de la promo.

## Acceptance criteria

1. **AC-1 (datos):** tras `pnpm transform`, un producto con
   `{ "descuento_pct": 10 }` en `offers.json` tiene en `products.json`:
   `precio_regular` = precio sin promo, `descuento_pct` = 10, `precio_venta` =
   `round(precio_regular × 0.9)`, `en_oferta: true`. Un producto en oferta
   flag-only **no** tiene `precio_regular` ni `descuento_pct`. *Verificado por:*
   Vitest sobre `buildPublicProduct` + corrida real sobre `511950004`.
2. **AC-2 (UI):** la card y la ficha de un producto en oferta con descuento
   muestran el precio anterior tachado, `−N%` y el precio final. *Verificado
   por:* Playwright sobre `511950004` (precio final `24408`, anterior `27120`,
   `−10%`).
3. **AC-3 (sin oferta / flag-only):** un producto sin oferta muestra un único
   precio, sin tachado. Uno en oferta flag-only muestra el badge pero un único
   precio. *Verificado por:* Playwright.
4. **AC-4 (validación):** `isProduct` acepta los opcionales bien formados y
   rechaza: `descuento_pct` sin `precio_regular`; `precio_regular ≤ precio_venta`.
   *Verificado por:* Vitest.
5. **AC-5 (RNF-03 / a11y):** `pnpm check:leak` verde (los campos son precios
   propios, no costo/margen). El precio anterior tiene etiqueta accesible; los
   colores pasan AA. *Verificado por:* `check:leak` + revisión.
6. **AC-6 (determinístico):** `pnpm transform` dos veces deja `products.json`
   igual; el orden de claves es estable. *Verificado por:* test + `git diff`.

## Notas

- Enmienda a documentar en `docs/rfc/0001-arquitectura-catalogo.md` §2.4.
- Tests existentes que asertan `Object.keys(row)` exactamente igual a
  `PRODUCT_KEYS` pasan a: *contiene todas las requeridas* y *no tiene claves
  fuera de requeridas ∪ opcionales*.
