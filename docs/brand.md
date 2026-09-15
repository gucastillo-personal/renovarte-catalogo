# RenovArte — marca

Guía mínima de identidad para el catálogo web (spec 0006). El sistema visual sale
del logo: **colibrí + lirio en línea fina, verde salvia, sobre crema**, con el
logotipo "renov**Arte**" y la bajada "SPA DE PIEL".

## Logo

Colores del archivo original: `#8FA88F` (salvia, ilustración + "Arte"),
`#4B5049` (gris-verde, "renov" + "SPA DE PIEL"), `#F7F3EE` (fondo crema).

| Archivo | Qué es | Dónde |
|---|---|---|
| `public/brand/logo.svg` | lockup completo (colibrí + lirio + "renovArte" + "SPA DE PIEL"), `viewBox 0 0 1254 1254` | OG image, usos de marca en grande |
| `public/brand/logo-wordmark.svg` | recorte horizontal de "renovArte" (viewBox `158 800 946 185`), fondo transparente | **header** (`<Image>`, `alt="RenovArte"`, `h-9`/`h-10`) |
| `src/app/icon.svg` | marca simple (hoja salvia sobre crema) | favicon — el line-art no lee a 16px |
| `src/app/apple-icon.png` | 360² (misma marca) | apple-touch-icon |
| `src/app/opengraph-image.png` | 1200×630, logo centrado sobre crema | `og:image` / `twitter:image` |

- Sobre fondo **crema** (`beige-50` / `beige-100`). No usar sobre verdes oscuros.
- El lockup completo necesita ~200px de ancho para leerse; abajo de eso, wordmark.

## Paleta

Definida como tokens en `src/app/globals.css` `@theme`. **No hardcodear hex** en
componentes — usar siempre `sage-*` / `beige-*`.

| Token | Hex | Uso |
|---|---|---|
| `beige-50` | `#faf8f2` | fondo de página |
| `beige-100` | `#f4f1e8` | fondo del logo · header · footer · superficies · cuerpo de ProductCard |
| `beige-200` | `#eae3d2` | bordes finos (hairline) |
| `beige-300` | `#ddd0b6` | bordes de inputs, detalles |
| `sage-50` | `#f3f5ef` | fondos sutiles (estado vacío) |
| `sage-100` | `#e7eede` | chip de categoría (inactivo), fondos suaves |
| `sage-200` | `#d1ddc3` | hover de chips claros |
| `sage-300` | `#b2c69e` | bordes decorativos |
| `sage-400` | `#92ac7c` | línea del logo · acentos |
| `sage-500` | `#7a9463` | **primario** — botones, chip activo, badge de oferta |
| `sage-600` | `#5f6b52` | texto secundario sobre crema (contraste AA) |
| `sage-700` | `#4b5441` | texto de títulos |
| `sage-800` | `#3d4436` | énfasis · nombre de producto en ProductCard |
| `sage-900` | `#333a2e` | texto de cuerpo |

Contraste: `sage-600`/`700`/`800`/`900` sobre `beige-50` pasan WCAG AA para texto
normal. El badge "Oferta" (`sage-600` bg / `beige-50` texto) pasa AA para UI.

## Tipografía

Cargadas con `next/font` (self-hosted, sin fetch externo).

| Rol | Fuente | Dónde |
|---|---|---|
| Display / `h1` | **Cormorant Garamond** (500/600, con itálica) | `--font-serif`; aplicada a `h1` y `.font-display` en `globals.css` |
| Cuerpo / UI | **Geist** | `--font-sans`; `body` |

El header usa el wordmark real (`logo-wordmark.svg`); Cormorant sólo para los
`h1` del sitio.

Etiquetas cortas tipo "SPA DE PIEL": mayúsculas con `tracking` amplio
(`tracking-[0.2em]` o más).

Nombre de producto en `ProductCard`: `text-sm font-semibold` (14px/600) —
más chico que el cuerpo base a propósito, para que el precio (`text-lg
font-semibold` vía `ProductPrice`) sea el dato dominante de la card.

## Radios y espaciado

- Radios: `rounded` (badges, chips pequeños), `rounded-lg` (cards, inputs),
  `rounded-full` (chips de `CategoryNav`).
- Ancho de contenido: `max-w-6xl` centrado, `px-4` de gutter (mínimo 16px a
  cualquier ancho).
- Padding del cuerpo de `ProductCard`: asimétrico (`pt-3 px-3.5 pb-4` —
  12px/14px/16px). Menos aire arriba (ya separado por la imagen), más
  abajo (el precio queda al pie via `mt-auto`).

## Metadata

`theme_color` / `viewport.themeColor`: `#f4f1e8` (crema del header).
`background_color` del manifest: `#faf8f2`.
