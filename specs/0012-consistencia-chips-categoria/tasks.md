# 0012 — Consistencia de marca: chips de categoría · Tasks

## Estimate

**Tamaño: S — 1.5 a 3 horas.** Cambio de dos constantes de clases Tailwind
en un único componente sin estado, más un archivo de test nuevo que cubre
render (AC-1/AC-2/AC-4) y un cálculo de contraste puro (AC-3); no toca
lógica, rutas, ni schema.

**Top riesgos que podrían mover el estimate:**

1. **AC-3 con margen angosto (~3.2:1 sobre un umbral de 3:1).** Si al ver el
   número calculado el CTO/CEO pide un ajuste (ej. `font-medium` en el chip
   activo) en vez de aceptar el resultado tal cual, eso es scope nuevo no
   cubierto abajo — se reportaría en vez de improvisarlo. Ver `plan.md`.
2. **Ninguno más.** Es un cambio de dos strings sin tocar JSX, lógica ni
   tests existentes; el riesgo residual es bajo.

## Tasks

- [x] **T1.** En `src/components/CategoryNav.tsx`, cambiar
  `INACTIVE` de `"bg-beige-100 text-sage-700 hover:bg-beige-200"` a
  `"bg-sage-100 text-sage-700 hover:bg-sage-200"`. *Check:* `pnpm build`
  sigue verde (sin errores de tipos ni de compilación).
- [x] **T2.** En el mismo archivo, cambiar `ACTIVE` de
  `"bg-sage-600 text-beige-50"` a `"bg-sage-500 text-beige-50"`. *Check:*
  `pnpm build` sigue verde.
- [x] **T3.** Crear `tests/unit/category-nav.test.tsx` (patrón de
  `tests/unit/offer-badge.test.tsx`: `renderToStaticMarkup`) con un test
  que renderiza `<CategoryNav />` sin `activeSlug` y asegura que un chip de
  categoría no activa (no "Todos") contiene `bg-sage-100` y `text-sage-700`
  en su HTML. *Check:* `pnpm test tests/unit/category-nav.test.tsx` — este
  test en verde (AC-1).
- [x] **T4.** En el mismo archivo, agregar un test que renderiza
  `<CategoryNav />` sin `activeSlug` y asegura que el chip "Todos" (activo
  por default) contiene `bg-sage-500` en su HTML. *Check:* mismo comando,
  test en verde (AC-2).
- [x] **T5.** En el mismo archivo, agregar un test que — cuando el catálogo
  tiene ofertas (`getProductsOnOffer().length > 0`; si el fixture actual no
  tiene ofertas, condicionar el test igual que hace el e2e existente con
  `test.skip`/guard equivalente en Vitest) — el chip "Ofertas" conserva
  `bg-sage-100` y `text-sage-800` en su HTML, sin `bg-sage-500` cuando no es
  el activo. *Check:* mismo comando, test en verde (AC-4).
- [x] **T6.** En el mismo archivo, agregar el test de contraste puro
  descripto en `plan.md`: una función `relativeLuminance`/`contrastRatio`
  local (o inline en el test) sobre los hex literales de `sage-500`
  (`#7a9463`) y `beige-50` (`#faf8f2`), con `expect(ratio).toBeGreaterThanOrEqual(3)`
  y un comentario que documente el valor calculado y la vara de 3:1
  ("AA para UI", citando `docs/brand.md`). *Check:* mismo comando, test en
  verde (AC-3), y el valor impreso/comentado en el test coincide con el
  reportado en `plan.md` (~3.2:1).
- [x] **T7.** Correr la suite completa: `pnpm test` (unit) y `pnpm test:e2e`
  (Playwright). *Check:* ambas en verde, en particular los tests de spec
  0003 (`aria-current`, filtro por categoría) y spec 0005 (chip "Ofertas"
  condicional) en `tests/e2e/catalog.spec.ts` sin modificar (AC-5).
- [x] **T8.** Correr el gate completo: `pnpm gate`. *Check:* verde
  (lint, build, typecheck, unit, `check:leak`, e2e).
- [x] **T9.** Actualizar `specs/README.md`: fila de la spec 0012 en el
  índice de features pasa de "Backlog" a "Built" (con el conteo de tests
  nuevo), y las menciones de 0012 en la matriz de trazabilidad (RF-02,
  RNF-04, RNF-05) pasan de "(Backlog)" a reflejar el estado construido.
  *Check:* diff de `specs/README.md` revisado, sin dejar menciones
  colgantes de "Backlog" para 0012.
