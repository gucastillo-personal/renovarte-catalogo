# 0011 — Sección de misión/nosotros como centro de la home

**Status:** Backlog
**PRD:** RF-11, RF-12 (enmienda 2026-09-14 a [PRD-catalogo-renovarte.md](../../docs/PRD/PRD-catalogo-renovarte.md))

## Problema

Hoy la home entra directo al catálogo: un `h1` que dice "Catálogo", el
filtro de categorías y la grilla de productos — nada le cuenta al
visitante qué es RenovArte ni por qué existe antes de mostrarle productos
para comprar. El negocio ya tiene contenido de marca pensado y publicado
(la primera publicación de Instagram de @renovarte_by_juli, un carrusel de
5 mensajes que cuentan la filosofía de "renovarte, piel por piel") que no
está en ningún lado de la web. El pedido explícito del CTO/CEO es que esa
misión sea lo primero que se vea — el centro de la home — y que el
catálogo de productos pase a un segundo plano (secundario, no eliminado).

## Objetivo

Que cualquier visitante que entre a la home de RenovArte entienda primero
la misión y la identidad de la marca, y recién después llegue al catálogo
de productos — invirtiendo la jerarquía actual, en la que el catálogo es
lo único que hay.

## Alcance

### In

- Nueva sección de misión/nosotros en la home (`src/app/page.tsx`),
  ubicada **primero** en el orden visual/de contenido — antes del heading
  "Catálogo", `CategoryNav` y `CatalogView`.
- Copy basado en los mensajes core de la publicación de origen (ver
  "Contenido fuente" abajo), usados tal cual o con adaptación mínima de
  formato (saltos de línea, tamaño) al pasar de carrusel de Instagram a
  sección web — sin inventar mensajes nuevos que cambien el tono o el
  sentido.
- Cierre de la sección con el logo/wordmark de RenovArte ya existente en
  `public/brand/`, en línea con el cierre "Este es nuestro comienzo" +
  logo del carrusel original.
- El catálogo de productos (heading, `CategoryNav`, `CatalogView`) se
  mantiene funcionalmente intacto — mismo comportamiento de filtro,
  búsqueda y grilla (RF-01 a RF-04) — pero pasa a ser el segundo bloque de
  la misma home, debajo de la sección de misión. No se elimina, no se
  mueve a otra URL.
- Tratamiento visual propio de la sección, acorde a
  [`docs/brand.md`](../../docs/brand.md): fondo/textura en la paleta
  crema/sage (`beige-*`/`sage-*`), tipografía Cormorant Garamond para los
  mensajes destacados — no fotos de stock genéricas, no las capturas de
  pantalla de Instagram tal cual (tienen superpuesta la UI de la app, no
  son arte final).
- Responsive: la sección se lee completa y sin recortes a ~390px de
  ancho, sin scroll horizontal, igual que el resto del sitio (RNF-04 ya
  vigente).
- Los 5 mensajes se presentan como **carrusel/slider**, replicando la
  experiencia del post de Instagram de origen (decisión del CTO/CEO,
  2026-09-14) — el detalle de interacción (auto-avance, controles,
  comportamiento sin JS) lo define `ux.md`, no esta spec.
- Un **CTA/enlace visible** ("Ver catálogo" o similar) al final de la
  sección de misión, para bajar hacia el catálogo ahora que este ya no es
  lo primero que se ve (decisión del CTO/CEO, 2026-09-14).

### Out

- Foto, bio, firma o cualquier presencia personal de Juli (fundadora,
  "cara de la marca") — queda explícitamente para un feature futuro
  separado. Ver nota de riesgo/diseño más abajo.
- El texto de storytelling extendido del caption (la historia personal
  completa de la fundadora) — no fue transcripto completo por el
  CTO/CEO y no se inventa; no se publica hasta que ese contenido exista
  (ver Preguntas abiertas).
- Subir las capturas de pantalla de Instagram tal cual como imágenes de
  producción de la web.
- Cualquier cambio a la lógica o funcionalidad del catálogo en sí
  (filtros, buscador, ficha de producto, ofertas) — RF-01 a RF-05 quedan
  intactos, solo cambia su posición en la home.
- Cambios al header, footer o logo existentes, salvo el mínimo
  imprescindible para acomodar el nuevo orden de la home.
- CTA de venta, contacto o turnero — no existe backend en este repo
  (`constitution.md §II.4`) y no fue pedido.
- Analytics o medición de scroll/engagement de la nueva sección.

### Contenido fuente (copy de marca a usar)

Los 5 mensajes de la primera publicación de Instagram de
@renovarte_by_juli, transcriptos por el CTO/CEO:

1. "Cada piel tiene su propia historia."
2. "Tu piel está viva. Cambia, respira, se transforma. Conocerla es el
   primer paso."
3. "El arte está en observar y elegir lo que cada piel necesita. Piel por
   piel."
4. "Renovarte no es empezar de cero."
5. "Este es nuestro comienzo." (cierra con el logo/wordmark de la marca)

## Acceptance criteria

1. **AC-1 (RF-11):** En la home, la sección de misión/nosotros es el
   primer bloque de contenido dentro de `<main>` — antes del heading
   "Catálogo" y de la grilla de productos. *Verificable por:* orden de
   aparición en el árbol de la página / Playwright.
2. **AC-2 (RF-11):** La sección muestra el copy de marca listado en
   "Contenido fuente" (los 5 mensajes, o al menos los 4 mensajes core sin
   el storytelling extendido pendiente) sin depender de una foto ni una
   bio personal para tener sentido.
3. **AC-3 (RF-11):** La sección cierra visualmente con el logo/wordmark
   de RenovArte, igual que el cierre del carrusel de origen.
4. **AC-4 (RF-12):** El catálogo de productos (heading, filtro de
   categoría, buscador, grilla) sigue presente y funcional en la misma
   home, ubicado después de la sección de misión — ningún acceptance
   criterion de las specs 0001, 0003, 0004 o 0005 deja de cumplirse.
5. **AC-5 (RNF-04, brand.md):** La sección de misión no usa fotos de
   stock genéricas ni las capturas de pantalla de Instagram originales;
   usa color/fondo/tipografía del sistema de marca documentado en
   `docs/brand.md`.
6. **AC-6 (RNF-04):** A 390px de ancho, la sección se lee completa, sin
   scroll horizontal ni texto cortado o superpuesto.
7. **AC-7 (RF-11):** Los 5 mensajes se presentan como carrusel/slider
   (no los 5 apilados estáticos en un único scroll). El contenido de los 5
   mensajes es accesible aunque JS no cargue (sitio SSG).
8. **AC-8 (RF-11):** Existe un CTA/enlace visible al final de la sección
   de misión que lleva al catálogo (scroll o navegación), sin depender de
   que el visitante lo descubra por scroll natural.

## Nota de riesgo / diseño a futuro

El CTO/CEO fue explícito: la presencia de Juli (foto + bio de la
fundadora) se agrega en una iteración futura separada, no en esta. El
diseño de esta sección no debe cerrar la puerta a agregar esa pieza más
adelante (por ejemplo, dejando lugar para un bloque adicional de
"quién está detrás de RenovArte") — esto es una restricción a tener en
cuenta en `plan.md`, no un acceptance criterion de esta iteración.

## Decisiones del CTO/CEO (2026-09-14)

1. **Caption completo: queda para después.** Esta iteración usa solo los
   5 mensajes core transcriptos (ver "Contenido fuente"). El storytelling
   personal extendido de Juli se suma en un feature futuro, junto con su
   presencia (foto/bio) — sigue **Out** de esta spec.
2. **CTA "Ver catálogo": sí.** Ver AC-8.
3. **Formato: carrusel/slider**, replicando el post de origen. Ver AC-7;
   el diseño de interacción concreto (auto-avance, controles, accesibilidad,
   comportamiento sin JS) se define en `ux.md` antes de que el developer
   agent escriba `plan.md`.
4. **Sección exclusiva de la home** — no se repite en `/categoria/[slug]`
   ni `/ofertas` en esta iteración.

## Preguntas abiertas

1. ¿Quién provee el asset visual final (fondo/textura crema-sage,
   ilustración, etc.) más allá de la paleta y tipografía ya documentadas
   en `docs/brand.md`? No hay diseñador ni asset de producción
   identificado todavía — por defecto, `ux.md`/`plan.md` deberían resolver
   esto con los tokens de color existentes (sin fotos), salvo que el
   CTO/CEO provea un asset propio antes de la implementación.

**Conflictos con `constitution.md`:** ninguno detectado. La sección es
100% presentación estática (SSG), no requiere backend, base de datos ni
cambios al schema de `public/data/products.json` — compatible con
`constitution.md §II.4` y §II.8.
