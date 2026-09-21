# 0015 — Agrupación de categorías en dos niveles (filtros y pills; fuente: `codCategoria`)

**Status:** Backlog
**PRD:** RF-13 (enmienda 2026-09-17); no reemplaza RF-02, que sigue vigente.
**Depende de:** `renovarte-pipeline` spec `0001-agrupacion-alto-nivel-categorias`
(Backlog) — este spec no se puede implementar hasta que `products.json`
exponga el campo de agrupación de alto nivel. Ver ese spec para el detalle
del lado de datos.

> **Decisión del CTO/CEO (2026-09-17), resuelve las preguntas abiertas
> originales de este spec:** son **4 grupos posibles**, no 2 — 3 con
> nombre de negocio más un fallback genérico. El campo fuente en
> `products.json` se llama **`codCategoria`** (id crudo de Serlaca:
> `"1"`/`"2"`/`"3"`/`"4"`) — ver tabla completa en
> `## Grupos (decidido)` más abajo. Queda abierto solo el nombre visible
> del grupo `"4"` (sugerido "Otros", a confirmar) y el diseño visual
> concreto del segundo nivel, que ya estaban marcados como fuera de
> alcance de este spec.

## Problema

Hoy `CategoryNav` (spec 0003) muestra las ~24 categorías del catálogo
(`productLine` de Serlaca: "Antiage", "Pieles Grasas", "Uñas", etc.) en una
única fila plana de pills, todas al mismo nivel. Esa lista mezcla
categorías de cuidado facial/personal con categorías de cosmética
(maquillaje, color), sin ninguna agrupación visual o funcional entre
ambas.

El CTO/CEO notó que LACA/Serlaca sí distingue grandes grupos en su propia
API — el mismo request de búsqueda de productos devuelve resultados
distintos según el `productCategoryIds` que se le pase, variando solo ese
id. Quiere que la experiencia de filtros/pills del catálogo de RenovArte
refleje esa misma separación, en vez de la lista plana única de hoy.
Definición de negocio ya cerrada: son 3 grupos con nombre (Cuidado facial,
Cuidado corporal, Cosmética) más un cuarto genérico de fallback — ver
`## Grupos (decidido)` más abajo.

## Objetivo

Que un visitante pueda encontrar productos más rápido separando primero
por el tipo general de producto (Cuidado facial, Cuidado corporal,
Cosmética, o el grupo genérico de fallback) y después, si quiere, afinando
por categoría específica dentro de ese grupo — en vez de tener que
escanear una fila de ~24 pills sin ningún orden de alto nivel.

## Grupos (decidido)

Definición de negocio del CTO/CEO (2026-09-17). El campo fuente en
`products.json` es `codCategoria` (id crudo de `productCategoryIds` de
Serlaca, publicado por `renovarte-pipeline` spec 0001):

| `codCategoria` | Grupo |
|---|---|
| `"1"` | Cuidado facial |
| `"2"` | Cuidado corporal |
| `"3"` | Cosmética |
| `"4"` | Genérico / fallback — **nombre visible sugerido "Otros"**, a confirmar con el CTO/CEO (no bloqueante) |

El mapeo `codCategoria` → nombre de grupo vive en un archivo de referencia
del lado de `renovarte-pipeline` (no hardcodeado en el código de este
repo) — ver el spec espejo para la ubicación propuesta
(`data/reference/serlaca_category_groups.json`) y si este repo consume el
id crudo o el nombre ya resuelto (decisión de `plan.md`, no de este spec).

## Alcance

### In

- Un nivel adicional de navegación/filtro por encima de las categorías
  específicas actuales, basado en el campo de agrupación de alto nivel que
  exponga `products.json` (dependencia del spec de `renovarte-pipeline`
  arriba).
- Dentro de un grupo elegido, seguir pudiendo filtrar por categoría
  específica (no se pierde la granularidad de RF-02 / spec 0003).
- Una forma de volver a "todos los productos", sin restricción de grupo ni
  categoría (paridad con el "Todos" de hoy).
- El resto del catálogo (buscador RF-03, ficha de detalle RF-04, indicador
  de oferta RF-05) sigue funcionando sin cambios sobre esta navegación.
- Responsive / mobile-first (RNF-04): sin scroll horizontal a 390px.

### Out

- Cambios al modelo de precio, margen u ofertas.
- Filtros nuevos por línea de producto, composición o "necesidad de uso"
  (los otros campos que Serlaca acepta en su body de búsqueda —
  `productLineCodes`, `productCompositionIds`, `productNecessityIds`,
  `productUseInIds`) — el pedido del CTO/CEO es específicamente separar
  cuidado facial de cosmética, no sumar un buscador avanzado con todos los
  filtros de Serlaca.
- Multi-selección de categorías o combinación de filtros (checkboxes) —
  sigue siendo selección única, como hoy.
- Cómo el pipeline determina/publica `codCategoria` o su archivo de mapeo
  — eso es del spec de `renovarte-pipeline` (0001) y del RFC que lo
  implemente.
- Nombre visible final del grupo `"4"` (sugerido "Otros" en el spec de
  `renovarte-pipeline` — no confirmado por el CTO/CEO todavía, ver
  Preguntas abiertas).
- El diseño visual concreto del segundo nivel (tabs, acordeón, dos filas,
  dropdown) — es una decisión de UX que corresponde al `plan.md`/RFC del
  developer-agent, no a este spec.

## Acceptance criteria

1. **AC-1 (RF-13):** Al entrar al catálogo, el visitante tiene una forma de
   elegir entre los grupos de alto nivel disponibles (Cuidado facial,
   Cuidado corporal, Cosmética, y el grupo de fallback si tiene productos)
   — no ve una única lista plana que mezcla categorías de todos los
   grupos sin distinción, como ocurre hoy.
2. **AC-2 (RF-13):** Al elegir un grupo, la grilla de productos muestra solo
   productos cuyas categorías pertenecen a ese grupo, y las categorías
   específicas ofrecidas para seguir filtrando se acotan a las de ese
   grupo.
3. **AC-3 (RF-13):** Existe una opción para volver a ver todos los
   productos del catálogo sin restricción de grupo ni categoría.
4. **AC-4 (RF-02):** Dentro de un grupo, el visitante puede seguir
   filtrando por una categoría específica y llegar a una URL propia y
   compartible para esa selección, igual que hoy permite `/categoria/[slug]`
   (la forma exacta de la URL con el nuevo nivel se define en el plan, pero
   la propiedad "URL compartible por selección" no se pierde).
5. **AC-5 (RNF-04):** La navegación de dos niveles no genera scroll
   horizontal ni rompe el layout a 390px de ancho.
6. **AC-6 (RF-13):** Todo producto de `products.json` tiene un `codCategoria`
   válido (`"1"`–`"4"`, por diseño del pipeline — spec 0001, AC-2/AC-3), así
   que ninguno debería quedar sin grupo; si igualmente llegara un producto
   con `codCategoria` ausente o no reconocido (dato inesperado), el
   catálogo no lo hace desaparecer silenciosamente de "Todos" — sigue
   siendo visible ahí.

## Preguntas abiertas

1. **Bloqueante:** este spec no puede pasar a diseño/RFC hasta que el spec
   `0001-agrupacion-alto-nivel-categorias` de `renovarte-pipeline` publique
   `codCategoria` (y su archivo de mapeo) en `products.json` — hoy ese
   campo todavía no existe. La definición de negocio (4 grupos, nombres,
   mapeo de ids) ya está cerrada; lo que falta es la implementación del
   lado del pipeline.
2. **Nombre del grupo fallback (`codCategoria: "4"`):** el CTO/CEO no dio
   nombre para este grupo. El spec de `renovarte-pipeline` sugiere "Otros"
   — a confirmar con el CTO/CEO antes o durante la implementación; no
   bloqueante (el resto de los 3 grupos con nombre ya está decidido: Cuidado
   facial, Cuidado corporal, Cosmética).
3. **¿El grupo `"4"` es visible como pestaña propia o solo aparece si tiene
   productos?** No decidido — depende de cuántos productos reales caigan
   ahí una vez implementado el mapeo del lado de pipeline; a definir en
   `plan.md` con datos reales.
