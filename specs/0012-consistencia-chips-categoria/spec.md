# 0012 — Consistencia de marca: chips de categoría (`CategoryNav`)

**Status:** Backlog
**PRD:** RF-02 (filtro por categoría), RNF-04 (responsive/consistencia visual), RNF-05 (portfolio-grade, documentado)
**No agrega requisitos nuevos al PRD.** Este spec corrige una desviación (drift)
entre lo implementado y `docs/brand.md` — documento de marca ya aprobado en la
spec 0006 (`Status: Built`), cuya AC-2 exige que la paleta `sage`/`beige` se use
"consistently" y sin valores sueltos que no vengan de los tokens documentados.
No hace falta enmendar `docs/PRD/PRD-catalogo-renovarte.md` porque la
obligación de seguir `brand.md` ya existe (spec 0006, RNF-05); esto es una
corrección de implementación, no una decisión de producto nueva.

**Origen:** el CTO/CEO revisó el mockup interactivo de UX de la spec 0011
(https://claude.ai/artifact/1AMG2PS4kzpQYrppfMFvQU — también referenciado en
`specs/0011-mision-home/ux.md` línea 3, que incluye una vista simplificada del
bloque de catálogo existente) y notó que los chips de categoría del mockup no
coinciden visualmente con los chips implementados en el sitio.

## Problema

`docs/brand.md` (tabla de paleta, spec 0006) documenta explícitamente:

- `sage-100` → "chip de categoría (inactivo), fondos suaves"
- `sage-500` → "primario — botones, **chip activo**, badge de oferta"
- `sage-600` → "texto secundario sobre crema (contraste AA)" — no está
  documentado como fondo de chip.

La implementación actual de `CategoryNav` no usa esos tokens para el chip
inactivo ni para el activo: usa `beige-100`/`sage-700` para el estado
inactivo y `sage-600`/`beige-50` para el activo. El chip "Ofertas" (spec
0005), en cambio, sí usa `sage-100`/`sage-800` — la paleta correcta según
`brand.md`. El mockup de UX de la spec 0011 refleja los tokens de
`brand.md`, no la implementación actual — por eso el CTO/CEO ve una
diferencia: no es una preferencia nueva de ese mockup, es que el código de
`CategoryNav` quedó desalineado del documento de marca ya aprobado.

## Objetivo

Que los chips de categoría de `CategoryNav` (incluido "Todos") usen
exactamente los tokens de color que `docs/brand.md` ya documenta para chip
inactivo y chip activo, para que el catálogo sea visualmente consistente
con la guía de marca aprobada y con el mockup de UX que la refleja.

## Alcance

**In:**
- Color de fondo y de texto del estado **inactivo** de los chips de
  categoría de `CategoryNav` (incluye el chip "Todos").
- Color de fondo y de texto del estado **activo** de los chips de
  categoría de `CategoryNav` (incluye "Todos" cuando es la vista general).
- Confirmar que el contraste de texto sobre el nuevo fondo activo sigue
  cumpliendo AA para texto de UI, al mismo nivel que `brand.md` ya
  documenta para el badge de oferta (misma combinación de tokens).

**Out (explícito):**
- El chip **"Ofertas"** — ya usa los tokens correctos de `brand.md`
  (`sage-100`/`sage-800`); no se toca.
- Cualquier cambio de **comportamiento**: lógica de filtrado, rutas,
  `aria-current`, cantidad o listado de categorías, datos de
  `products.json`. Esto es un fix puramente visual (color), heredado del
  comportamiento ya definido y verificado en la spec 0003.
- **Cards de producto** (`ProductCard`) — el CTO/CEO también señaló una
  diferencia visual ahí respecto del mismo mockup, pero `brand.md` no fija
  un token de fondo/tipografía para el cuerpo de la card con la misma
  autoridad con la que fija los colores de chip, y el propio mockup se
  autodeclara "vista simplificada... no son datos reales". Queda
  deliberadamente fuera de este spec — ver "Preguntas abiertas".
- Cualquier otro componente que use `rounded-full`/chips fuera de
  `CategoryNav`.
- Modificar `docs/brand.md` — ya está aprobado (spec 0006); este spec solo
  alinea código a lo que ese documento ya dice.
- Accesibilidad más allá del contraste de color mencionado arriba (no
  cambia semántica, foco, ni `aria-*` existentes).

## Acceptance criteria

1. **AC-1 (RF-02, RNF-05):** El chip de categoría en estado **inactivo**
   (incluido "Todos" cuando no es la categoría activa) se ve con el fondo y
   el color de texto que `docs/brand.md` documenta para "chip de categoría
   (inactivo)" (`sage-100` de fondo, `sage-700` de texto). *Verificable
   por:* inspección visual/snapshot y un assert de estilo computado en
   test.
2. **AC-2 (RF-02, RNF-05):** El chip de categoría en estado **activo**
   (incluido "Todos" cuando es la vista general) se ve con el fondo y el
   color de texto que `docs/brand.md` documenta para "chip activo"
   (`sage-500` de fondo, texto sobre crema). *Verificable por:* inspección
   visual/snapshot y un assert de estilo computado en test.
3. **AC-3 (RNF-04):** El nuevo par fondo/texto del chip activo mantiene
   contraste suficiente para texto de componentes de UI (AA), verificado
   con la misma vara que `brand.md` ya aplica a la combinación equivalente
   del badge de oferta. *Verificable por:* cálculo de contraste (ratio) o
   herramienta de accesibilidad automatizada.
4. **AC-4:** El chip "Ofertas" no cambia de apariencia respecto de lo ya
   construido en la spec 0005 (sin regresión). *Verificable por:* los
   tests existentes de esa spec siguen pasando sin necesidad de tocar su
   intención.
5. **AC-5:** Ningún test existente de comportamiento de `CategoryNav`
   (spec 0003: `aria-current`, navegación, 24 categorías; spec 0005: chip
   de ofertas condicional) deja de pasar — el cambio es exclusivamente de
   color. *Verificable por:* suite de tests de esas specs en verde.

## Preguntas abiertas

1. **Cards de producto (`ProductCard`):** el mockup de UX (spec 0011) muestra
   una card con fondo `beige-100` (en vez del `bg-white` implementado hoy),
   padding asimétrico, y el nombre del producto con `font-weight: 600` y
   `font-size: .88rem` (en vez del `font-medium` sin tamaño explícito que
   hereda el tamaño base actual). A diferencia de los chips, acá no hay una
   contradicción con `brand.md` — ese documento no asigna un token de fondo
   para el cuerpo de la card (solo fija `rounded-lg` para el radio, que sí
   coincide con la implementación salvo por un detalle menor de `10px` vs.
   el radio de Tailwind usado). El mockup, además, se autodeclara "vista
   simplificada del bloque existente — no son datos reales", es decir su
   propia intención declarada era representar lo ya construido, no proponer
   un rediseño — por lo que no alcanza como fuente de verdad de diseño por
   sí solo. **Decisión pendiente del CTO/CEO:** ¿el fondo/tipografía de la
   card actual es aceptable tal cual (el mockup fue impreciso), o se quiere
   una revisión de diseño real de la card (UX) antes de escribir un spec de
   corrección análogo a este? Este spec no asume una respuesta y no incluye
   acceptance criteria de card.
2. Si la respuesta a (1) es "sí, revisar", corresponde abrir un spec nuevo
   (siguiente número libre) una vez exista una definición de diseño para la
   card — no una enmienda a la 0001 (walking skeleton, ya cerrada como
   histórica) ni a este 0012 (alcance ya cerrado a chips).
