# 0014 — Fix de contraste: precio anterior tachado en `ProductPrice`

**Status:** Backlog
**PRD:** RF-05 (el sistema debe marcar visualmente los productos en oferta),
RNF-04 (el sitio debe ser responsive y usable en mobile), RNF-05 (código
portfolio-grade, documentado). **No agrega requisitos nuevos al PRD.** Este
spec corrige una implementación existente para que cumpla lo que
`docs/brand.md` (spec 0006, `Status: Built`) ya documenta sobre contraste —
mismo patrón que la spec 0012 (fix de consistencia/accesibilidad, sin RF/RNF
nuevo).

**Origen:** el `tester-agent` detectó y recalculó este problema durante la
verificación de las specs 0012 (chips de categoría) y 0013 (cuerpo de
`ProductCard` y `ProductGrid`). El problema es **preexistente** a ambas — no
fue introducido por ninguna de las dos — y quedó reportado explícitamente en
`specs/README.md`, fila de RNF-05, como "posible spec de corrección futuro".
El CTO/CEO decidió abordarlo ahora, como spec separada, precisamente porque
`ProductPrice.tsx` es un componente compartido (`ProductCard` con
`size="sm"`, ficha de detalle con `size="lg"`) y las specs 0012/0013 tenían
la restricción explícita de no tocarlo para no arriesgar la ficha de detalle
sin evaluarla con foco.

## Problema

`docs/brand.md` (tabla de paleta) documenta `sage-500` como color
**primario de acento** — "botones, chip activo, badge de oferta" — pensado
para usarse como fondo o como color de elementos de UI destacados, no como
color de texto secundario sobre fondo crema. Para ese segundo caso, la
propia guía de marca ya define un token distinto: `sage-600`, "texto
secundario sobre crema (contraste AA)", con la nota explícita más abajo de
que "`sage-600`/`700`/`800`/`900` sobre `beige-50` pasan WCAG AA para texto
normal".

`src/components/ProductPrice.tsx` no sigue esa guía para el precio anterior
tachado (el `<s>` que se muestra cuando un producto está en oferta): usa
`text-sage-500` en vez de `text-sage-600`. El resultado, verificado por
cálculo de contraste (fórmula WCAG de luminancia relativa, `sage-500`
`#7a9463`):

| Contexto | Fondo | Ratio calculado | Umbral AA texto normal |
|---|---|---|---|
| `ProductCard` (`size="sm"`) | `beige-100` `#f4f1e8` | ≈2.98:1 | 4.5:1 — **no pasa** |
| Fondo anterior de `ProductCard`, pre-spec-0013 | `bg-white` `#ffffff` | ≈3.36:1 | 4.5:1 — **no pasa** (ya fallaba antes de 0013) |
| Ficha de detalle (`size="lg"`) | `beige-50` `#faf8f2` (heredado del `<body>`, `producto/[id]/page.tsx` no envuelve `ProductPrice` en un fondo propio) | ≈3.17:1 | 4.5:1 — **no pasa** |

Es decir, el problema existe **en los dos lugares donde se usa el
componente**, y no es nuevo: ya fallaba contra `bg-white` antes de la spec
0013, y sigue fallando (con un ratio distinto) contra `beige-100` después de
esa spec. La spec 0013 confirmó y dejó registrado el número sobre el fondo
nuevo, pero no lo corrigió a propósito (fuera de su alcance).

`sage-600` (`#5f6b52`), en cambio, calculado con la misma fórmula:

| Contexto | Fondo | Ratio calculado |
|---|---|---|
| `ProductCard` | `beige-100` | ≈5.0:1 — pasa AA |
| Ficha de detalle | `beige-50` | ≈5.3:1 — pasa AA |

`sage-600` es también el color que `ProductCard.tsx` ya usa hoy para la
presentación del producto (`text-sm text-sage-600`) sobre el mismo fondo
`beige-100`, así que no introduce un tono nuevo en la card — reutiliza un
token ya presente y ya pensado para "texto secundario sobre crema".

## Objetivo

Que el precio anterior tachado de `ProductPrice` sea legible con contraste
AA (4.5:1, texto normal) en los dos contextos donde se muestra —
`ProductCard` sobre `beige-100` y la ficha de detalle sobre `beige-50` —
sin alterar su semántica (tachado, etiqueta accesible), su tamaño, ni
ningún otro elemento del componente.

## Alcance

**In:**
- El color de texto del `<s>` (precio anterior) en
  `src/components/ProductPrice.tsx` — el único cambio propuesto es de
  color (`text-sage-500` → un token que cumpla AA sobre ambos fondos,
  ver "Preguntas abiertas").
- Confirmar por cálculo de contraste que el nuevo color pasa AA (4.5:1)
  tanto sobre `beige-100` (`ProductCard`) como sobre `beige-50` (ficha de
  detalle, fondo heredado del `<body>`).

**Out (explícito):**
- Tamaño de fuente del precio anterior (`text-xs` en `size="sm"`,
  `text-base` en `size="lg"`) — no cambia. El problema es de color, no de
  tamaño.
- Cualquier otro elemento de `ProductPrice`: el precio final
  (`text-sage-900`, `FINAL_SIZE`) y el chip de descuento
  (`bg-sage-100`/`text-sage-800`) — ninguno de los dos tiene el problema de
  contraste reportado; no se tocan.
- Semántica del `<s>` (tachado) y el `<span className="sr-only">Precio
  anterior: </span>` — no cambian; el fix es puramente visual.
- Layout, espaciado (`gap-x-2 gap-y-1`, `flex-wrap`) o cualquier otro
  aspecto estructural de `ProductPrice`, `ProductCard` o la ficha de
  detalle.
- `OfferBadge` — no usa `ProductPrice` ni comparte el problema reportado
  (ya evaluado y confirmado sin regresión en la spec 0013, AC-3).
- Cualquier componente fuera de `ProductPrice.tsx` — el problema y el fix
  están acotados a ese archivo; `ProductCard.tsx` y
  `producto/[id]/page.tsx` no necesitan cambios propios (ambos ya pasan la
  prop `product`/`size` sin especificar color).
- Modificar `docs/brand.md` — ya documenta el token correcto (`sage-600`)
  para este caso; si el desarrollador confirma que `sage-600` es el valor
  final, no hace falta enmendar la guía, solo alinear el código a lo que
  ya dice.

## Acceptance criteria

1. **AC-1 (RF-05, RNF-04):** En `ProductCard` (fondo `beige-100`), el
   precio anterior tachado se muestra con un color de texto cuyo contraste
   contra ese fondo es de al menos 4.5:1 (WCAG AA, texto normal).
   *Verificable por:* cálculo de contraste (ratio) o herramienta de
   accesibilidad automatizada.
2. **AC-2 (RF-05, RNF-04):** En la ficha de detalle de producto (fondo
   `beige-50` heredado de la página), el precio anterior tachado se
   muestra con un color de texto cuyo contraste contra ese fondo es de al
   menos 4.5:1 (WCAG AA, texto normal). *Verificable por:* cálculo de
   contraste (ratio) o herramienta de accesibilidad automatizada.
3. **AC-3 (RF-05):** El precio anterior sigue siendo un elemento tachado
   (semántica de "precio anterior/descontado" preservada) y sigue teniendo
   una etiqueta accesible equivalente a "Precio anterior: " para lectores
   de pantalla — el fix no depende únicamente del color para comunicar que
   es un precio anterior. *Verificable por:* test existente que consulta
   el `sr-only` y el elemento `<s>` sigue pasando sin modificación de
   intención.
4. **AC-4:** El tamaño de fuente del precio anterior (`text-xs` en
   `ProductCard`, `text-base` en la ficha de detalle) no cambia respecto
   de lo ya construido en la spec 0007. *Verificable por:* assert de clase
   o estilo computado en test, o inspección visual — sin cambio de layout
   perceptible más allá del color.
5. **AC-5:** El precio final (dato dominante, `text-sage-900`) y el chip
   de descuento (`−N%`, `bg-sage-100`/`text-sage-800`) no cambian de
   apariencia como parte de este fix. *Verificable por:* los tests
   existentes de las specs 0007/0013 sobre `ProductPrice` siguen pasando
   sin necesidad de tocar su intención.
6. **AC-6:** El resto de tests existentes que ejercitan `ProductPrice`,
   `ProductCard` u `OfferBadge` (specs 0005, 0007, 0012, 0013) siguen en
   verde — el cambio es exclusivamente de color de un elemento puntual, sin
   regresión de comportamiento, filtrado, búsqueda o navegación.
   *Verificable por:* suites de tests de esas specs en verde.

## Preguntas abiertas

1. **Valor final del color.** Este spec calculó que `sage-600` (`#5f6b52`)
   pasa AA en ambos contextos (≈5.0:1 sobre `beige-100`, ≈5.3:1 sobre
   `beige-50`) y coincide con lo que `docs/brand.md` ya documenta como
   "texto secundario sobre crema (contraste AA)" — es la sugerencia obvia y
   no requiere una revisión de `ux-agent` (cambio de un solo token, con
   fuente de verdad ya escrita en `brand.md` + cálculo WCAG). Aun así, se
   deja como confirmación explícita del `developer-agent` en `plan.md`
   (recalcular el ratio exacto, y decidir si `sage-600` es preferible a
   otra opción como `sage-700` si por algún motivo se quisiera más margen
   de contraste) antes de implementar — no bloquea el paso a diseño/RFC,
   es una confirmación de cálculo, no una decisión de diseño abierta.
2. **`docs/brand.md`:** no se propone modificarlo — el token correcto ya
   está documentado. Si el `developer-agent` eligiera un color distinto de
   `sage-600` por algún motivo no previsto acá, correspondería entonces sí
   actualizar la guía y justificarlo en `plan.md`.
