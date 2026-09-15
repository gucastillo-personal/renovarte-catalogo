# 0012 — Consistencia de marca: chips de categoría · Plan

Checked against [`../constitution.md`](../constitution.md). Fix puramente
visual sobre un componente ya construido (spec 0003, extendido por 0005).

## Cambio de RFC: ninguno

No hay cambio de arquitectura, schema, ni invariante cross-cutting. Los
tokens `sage-100`/`sage-500`/`sage-700` ya están definidos en
`src/app/globals.css` desde la spec 0006 y documentados en `docs/brand.md`
(también spec 0006, ya `Built`); este spec solo corrige qué clases de
Tailwind usa `CategoryNav.tsx` para apuntar a los tokens correctos. No se
toca `docs/rfc/0001-arquitectura-catalogo.md` ni `docs/brand.md`.

## Archivo a cambiar

`src/components/CategoryNav.tsx` — solo las dos constantes de clases:

```ts
const INACTIVE = "bg-sage-100 text-sage-700 hover:bg-sage-200";
const ACTIVE = "bg-sage-500 text-beige-50";
```

- `INACTIVE`: `bg-beige-100` → `bg-sage-100`; el texto (`text-sage-700`) no
  cambia. El hover pasa de `hover:bg-beige-200` a `hover:bg-sage-200`, un
  paso más dentro de la misma escala `sage` — mismo patrón de sutileza que
  ya usa `OFFERS` (`bg-sage-100 ... hover:bg-sage-200`), que el spec cita
  como referencia (AC-1 in scope, no menciona hover explícitamente pero
  dejar `hover:bg-beige-200` sería reintroducir un token fuera de la
  familia `sage` para un chip que ya vive en `sage`).
- `ACTIVE`: `bg-sage-600` → `bg-sage-500`; `text-beige-50` no cambia.
- `CHIP` (radio, tamaño, foco) y `OFFERS` no se tocan — quedan fuera de
  alcance (AC-4, "Out").
- No cambia el JSX: mismos elementos, mismos `href`, mismos `aria-current`,
  mismo orden ("Todos" → "Ofertas" condicional → categorías). Cero cambio
  de comportamiento — solo las dos constantes de string de clases.

## AC-3 — contraste del nuevo par activo (`sage-500` / `beige-50`)

**Precedente ya en producción:** `MissionSection.tsx` (spec 0011, línea del
botón "Ver catálogo") ya usa exactamente `bg-sage-500 ... text-beige-50`
para su CTA primario, shippeado y en `Built`. Este spec no introduce un par
de color nuevo al sistema — extiende a `CategoryNav` un par que el propio
código ya usa en otro componente activo/primario.

**Cálculo de contraste (WCAG relative luminance, sRGB):**

| Par | Ratio | Vara |
|---|---|---|
| `sage-600` (`#5f6b52`) / `beige-50` (`#faf8f2`) — combo del badge "Oferta" que `docs/brand.md` cita como referencia de "pasa AA para UI" | ≈ 5.3:1 | Pasa AA texto normal (≥4.5:1) y AA UI (≥3:1) |
| `sage-500` (`#7a9463`) / `beige-50` (`#faf8f2`) — el par nuevo del chip activo | ≈ 3.2:1 | **No** llega a AA texto normal (4.5:1, aplicable si el label se lee como texto de 14px regular). **Sí** pasa el umbral de 3:1 que WCAG 1.4.11 exige para componentes de UI / texto grande, que es la vara que `brand.md` invoca literalmente ("pasa AA **para UI**", no "para texto") al validar la combinación equivalente del badge. |

**Lectura que sigue este plan:** AC-3 pide verificar "con la misma vara que
`brand.md` ya aplica" — esa vara, tal como está redactada en `brand.md`
("AA para UI"), es el umbral de 3:1, no el de 4.5:1 de texto de párrafo. Con
esa vara, `sage-500`/`beige-50` pasa (≈3.2:1 > 3:1), aunque con un margen
mucho más chico que el combo `sage-600` (≈5.3:1). Esto se deja explícito
como **riesgo** (ver abajo) porque el margen es angosto (~7%): un lector
estricto de AC-3 que exija el umbral de 4.5:1 (texto normal, no "componente
de UI") consideraría que el par no pasa. Este plan no cambia el color para
resolver la ambigüedad por su cuenta (eso sería exceder el alcance del spec,
que fija `sage-500`/"texto sobre crema" como el par a usar) — implementa
tal cual dice AC-2, corre el cálculo, y dejará el resultado (≈3.2:1, pasa la
vara de 3:1) documentado en el test y en el reporte final para que el
CTO/CEO lo revise con el número real delante.

**Cómo se verifica en test:** una función pura de contraste
(`relativeLuminance` + `contrastRatio`, formula WCAG estándar) contra los
hex literales de `sage-500` y `beige-50` tomados de
`src/app/globals.css`, con un assert `>= 3` y un comentario que documente
el número exacto y la vara elegida. Vive en
`tests/unit/category-nav.test.tsx` junto a los tests de AC-1/AC-2 (no
amerita un archivo aparte ni un helper productivo en `src/lib` — es
verificación de un valor de diseño ya fijo, no lógica de producto). Nota:
como la fórmula opera sobre literales hex de test, no sobre componentes,
esto no viola la regla "no hex fuera de `globals.css`" de `no-stray-hex.test.ts`
(ese test ya excluye explícitamente los archivos que necesitan hex real, y
un test no es un componente bajo `src/components`/`src/app`).

## Cómo se testea cada AC

| AC | Test |
|---|---|
| AC-1 (inactivo `sage-100`/`sage-700`) | Nuevo `tests/unit/category-nav.test.tsx`: `renderToStaticMarkup(<CategoryNav />)` (sin `activeSlug`, o con un `activeSlug` que no matchea ninguna categoría real) y `expect(html).toContain("bg-sage-100")` + `toContain("text-sage-700")` para un chip de categoría no activo. |
| AC-2 (activo `sage-500`) | Mismo archivo: `renderToStaticMarkup(<CategoryNav activeSlug={undefined} />)` (o pasando el slug de una categoría real) y `expect(html).toContain("bg-sage-500")` para el chip que queda activo ("Todos" o la categoría pasada). |
| AC-3 (contraste AA) | Mismo archivo, test de contraste puro descripto arriba — no depende de render. |
| AC-4 (no regresión "Ofertas") | Mismo archivo: cuando hay ofertas, el chip "Ofertas" sigue con `bg-sage-100 text-sage-800` (inactivo) — assert directo sobre el html, más confiar en que `OFFERS` no se tocó. No hace falta un test e2e nuevo: ya no hay ningún test e2e existente que dependa de las clases exactas de "Ofertas" (revisado `tests/e2e/catalog.spec.ts` — los tests de spec 0005 verifican texto/visibilidad/`href`, nunca clases CSS), así que correr la suite completa alcanza como evidencia de no-regresión. |
| AC-5 (no regresión 0003/0005) | `pnpm test` + `pnpm test:e2e` completos en verde — ninguno de esos tests (revisados: `tests/e2e/catalog.spec.ts`, tests unit existentes) asertan sobre `bg-beige-100`/`bg-sage-600`, solo sobre `aria-current`, texto visible y conteos, así que el cambio de color no los puede romper si el comportamiento no cambió. |

## Riesgos

1. **Margen angosto de AC-3 (~3.2:1 vs. umbral 3:1).** Ver sección de
   arriba. Si el CTO/CEO, al ver el número, prefiere el umbral de 4.5:1 en
   vez de 3:1, la resolución (dentro de este mismo spec, sin tocar
   `docs/brand.md` ni pedir un spec nuevo) sería agregar `font-medium` al
   chip activo para acercarlo al criterio de "texto grande/negrita" de
   WCAG, o subir el texto a un tono más oscuro de crema — pero **eso no
   está en `tasks.md`** salvo que el CTO/CEO lo pida explícitamente al
   revisar el resultado, porque AC-2 ya fija el par de color exacto y no
   deja ese grado de libertad. Se reporta como hallazgo, no se resuelve
   unilateralmente.
2. **Ninguno de arquitectura/alcance** — es un cambio de dos strings de
   Tailwind en un componente sin estado; no hay riesgo de romper build,
   tipos, ni rutas.
