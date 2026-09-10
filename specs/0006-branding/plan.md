# 0006 — Branding · Plan

Checked against [`../constitution.md`](../constitution.md).

> **Bloqueado en:** el archivo de logo real de RenovArte (lo pasa el usuario).
> Todo lo que no depende del logo se puede hacer igual; las tareas logo-dependientes
> están marcadas ⛔ abajo.

## Assets (Next 16 file conventions → `<head>` automático)

| Archivo | Genera | Fuente |
|---|---|---|
| `public/brand/logo.svg` | logo del header (`<Image>` o inline) | ⛔ logo real |
| `public/brand/logo-mark.svg` | marca sola (para favicon/OG si el full es ancho) | ⛔ |
| `src/app/icon.svg` (o `icon.png` 512²) | `<link rel="icon">` (favicon) | ⛔ |
| `src/app/apple-icon.png` (180²) | `<link rel="apple-touch-icon">` | ⛔ |
| `src/app/opengraph-image.tsx` | `og:image` 1200×630 vía `ImageResponse` de `next/og` | marca + tagline sobre fondo beige; embebe el logo como data URI si es simple |
| `src/app/manifest.ts` | `manifest.webmanifest` (name, short_name, theme_color sage, background_color beige, icons) | — |

## Paleta — `src/app/globals.css` `@theme`

- Muestrear los hex reales del logo (verdes / beiges) y ajustar las escalas
  `--color-sage-*` / `--color-beige-*` (hoy son placeholders razonables).
- Sacar el comentario "Placeholder values — finalized in spec 0006".
- Regla AC-2: ningún `#hex` suelto en `src/components/**` ni `src/app/**` fuera de
  `globals.css` → usar siempre tokens.

## Tipografía — `next/font` (self-hosted, sin fetch externo)

- Body: sans (mantener `Geist` o cambiar a algo más cálido — a decidir con el logo).
- Titulares: agregar un display **serif** (`next/font/google`, p. ej. Fraunces /
  Cormorant / Newsreader) → `--font-serif` en `@theme`, aplicado a `h1`/headings.
- `layout.tsx`: cargar la(s) fuente(s), setear las variables CSS en `<html>`.

## Header + metadata — `src/app/layout.tsx`

- Reemplazar el wordmark de texto por `<Link href="/"><Image src=".../logo.svg"
  alt="RenovArte" …/></Link>` (o SVG inline). ⛔
- `metadata`: `metadataBase`, `openGraph` (title, description, siteName, type,
  locale `es_AR`, url), `twitter` (`card: "summary_large_image"`), `applicationName`.
- `export const viewport`: `themeColor` (sage), `colorScheme: "light"`.

## `docs/brand.md`

Tabla de paleta (hex + uso), tipografía, uso del logo (mín. tamaño, área de
respeto, sobre qué fondos), radios/espaciado. Cumple AC-5.

## Tests

- `tests/e2e/catalog.spec.ts` (extender): logo visible en el header en `/`,
  `/categoria/<slug>`, `/producto/<id>`, `/ofertas`; `<link rel="icon">` presente;
  `og:title` / `og:image` / `twitter:card` presentes en `/`. Sin scroll
  horizontal a 390 / 768 / 1280 en home, categoría y ficha.
- `tests/unit/no-stray-hex.test.ts`: grep de `#[0-9a-fA-F]{3,6}` en
  `src/components/**` y `src/app/**` (excepto `globals.css`) → 0 matches (AC-2).

## Orden (lo que NO necesita el logo va primero)

1. Paleta final + comentario. 2. Tipografía + `docs/brand.md`. 3. `metadata` +
`viewport` + `manifest.ts`. 4. Test de hex sueltos + e2e de metadata/responsive.
5. ⛔ logo en header + `icon`/`apple-icon` + `opengraph-image` + e2e del logo.

## Verificación

```
pnpm gate
```
Manual: `/` en 390/768/1280; compartir la URL (og:image); favicon en la pestaña.
